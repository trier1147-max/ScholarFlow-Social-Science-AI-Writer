"""
文献管理路由
"""

import os
import hashlib
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.config import settings
from app.models.document import Document, Chunk
from app.schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUploadResponse,
    ChunkResponse
)
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationInfo
from app.services.parser import PDFParser
from app.services.vector_store import get_vector_store

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = logging.getLogger(__name__)


async def index_document_vectors(document_id: str, chunks: list, document_metadata: dict):
    """后台任务：将文献切片索引到向量库"""
    print(f"[VECTOR] Starting indexing for document {document_id}, {len(chunks)} chunks", flush=True)
    try:
        vector_store = get_vector_store()

        # 为每个切片添加ID
        chunks_with_ids = []
        for i, chunk in enumerate(chunks):
            chunk_with_id = {
                **chunk,
                "id": f"{document_id}_{i}",
                "chunk_index": i
            }
            chunks_with_ids.append(chunk_with_id)

        await vector_store.add_chunks(
            document_id=document_id,
            chunks=chunks_with_ids,
            document_metadata=document_metadata
        )
        print(f"[VECTOR] Successfully indexed {len(chunks)} chunks for document {document_id}", flush=True)
    except Exception as e:
        print(f"[VECTOR] ERROR: Failed to index document {document_id}: {e}", flush=True)


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="上传文献",
    description="上传并解析 PDF 文献文件"
)
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db)
):
    """
    上传并解析 PDF 文献
    
    - **file**: PDF 文件 (最大 50MB)
    
    上传后会自动：
    1. 解析 PDF 内容和元数据
    2. 将内容切片
    3. 在后台将切片向量化并存入向量库
    """
    # 验证文件类型
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只支持 PDF 文件"
        )
    
    # 验证文件大小
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件大小超过 {settings.MAX_FILE_SIZE_MB}MB 限制"
        )
    
    # 计算文件哈希
    file_hash = hashlib.md5(content).hexdigest()
    
    # 检查是否已存在
    existing = await db.execute(
        select(Document).where(Document.file_hash == file_hash)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该文献已存在"
        )
    
    # 保存文件
    file_path = settings.upload_path / f"{file_hash}.pdf"
    with open(file_path, "wb") as f:
        f.write(content)
    
    try:
        # 解析 PDF
        parser = PDFParser()
        parsed_data = await parser.parse(file_path)
        
        # 创建文献记录
        document = Document(
            title=parsed_data.get("title", file.filename.replace(".pdf", "")),
            authors=parsed_data.get("authors", []),
            year=parsed_data.get("year"),
            source=parsed_data.get("source"),
            abstract=parsed_data.get("abstract"),
            keywords=parsed_data.get("keywords", []),
            file_path=str(file_path),
            file_hash=file_hash,
            page_count=parsed_data.get("page_count", 0)
        )
        db.add(document)
        await db.flush()
        
        chunks = parsed_data.get("chunks", [])
        
        # 创建切片记录
        for i, chunk_data in enumerate(chunks):
            chunk = Chunk(
                document_id=document.id,
                content=chunk_data["content"],
                page_number=chunk_data.get("page_number", 1),
                section_title=chunk_data.get("section_title"),
                chunk_index=i,
                char_start=chunk_data.get("char_start", 0),
                char_end=chunk_data.get("char_end", 0)
            )
            db.add(chunk)
        
        await db.commit()
        await db.refresh(document)
        
        # 在后台将切片向量化（使用 Jina API，不占本地内存）
        if background_tasks and chunks:
            document_metadata = {
                "title": document.title,
                "authors": document.authors,
                "year": document.year
            }
            background_tasks.add_task(
                index_document_vectors,
                document.id,
                chunks,
                document_metadata
            )
            logger.info(f"Scheduled vector indexing for document {document.id}")
        
        return DocumentUploadResponse(
            data=DocumentResponse(
                id=document.id,
                title=document.title,
                authors=document.authors,
                year=document.year,
                source=document.source,
                abstract=document.abstract,
                keywords=document.keywords,
                file_path=document.file_path,
                page_count=document.page_count,
                chunk_count=len(chunks),
                created_at=document.created_at,
                updated_at=document.updated_at
            )
        )
        
    except Exception as e:
        # 删除已保存的文件
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF 解析失败: {str(e)}"
        )


@router.get(
    "",
    response_model=PaginatedResponse[DocumentListResponse],
    summary="获取文献列表"
)
async def list_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db)
):
    """获取文献列表，支持搜索和分页"""
    
    # 构建查询
    query = select(Document)
    count_query = select(func.count(Document.id))
    
    # 搜索过滤
    if search:
        search_filter = Document.title.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # 排序
    query = query.order_by(Document.created_at.desc())
    
    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # 分页
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # 执行查询
    result = await db.execute(query)
    documents = result.scalars().all()
    
    # 获取每个文献的 chunk 数量
    doc_list = []
    for doc in documents:
        chunk_count_result = await db.execute(
            select(func.count(Chunk.id)).where(Chunk.document_id == doc.id)
        )
        chunk_count = chunk_count_result.scalar() or 0
        
        doc_list.append(DocumentListResponse(
            id=doc.id,
            title=doc.title,
            authors=doc.authors,
            year=doc.year,
            source=doc.source,
            chunk_count=chunk_count,
            created_at=doc.created_at
        ))
    
    return PaginatedResponse(
        data=doc_list,
        pagination=PaginationInfo(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size
        )
    )


@router.get(
    "/{document_id}",
    response_model=ApiResponse[DocumentResponse],
    summary="获取文献详情"
)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取指定文献的详情"""
    
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文献不存在"
        )
    
    # 获取 chunk 数量
    chunk_count_result = await db.execute(
        select(func.count(Chunk.id)).where(Chunk.document_id == document_id)
    )
    chunk_count = chunk_count_result.scalar() or 0
    
    return ApiResponse(
        data=DocumentResponse(
            id=document.id,
            title=document.title,
            authors=document.authors,
            year=document.year,
            source=document.source,
            abstract=document.abstract,
            keywords=document.keywords,
            file_path=document.file_path,
            page_count=document.page_count,
            chunk_count=chunk_count,
            created_at=document.created_at,
            updated_at=document.updated_at
        )
    )


@router.delete(
    "/{document_id}",
    response_model=ApiResponse,
    summary="删除文献"
)
async def delete_document(
    document_id: str,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db)
):
    """删除指定文献及其所有切片"""
    
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文献不存在"
        )
    
    # 删除文件
    if document.file_path and os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    # 删除向量数据（后台执行）
    if background_tasks:
        async def delete_vectors():
            try:
                vector_store = get_vector_store()
                deleted = await vector_store.delete_document(document_id)
                logger.info(f"Deleted {deleted} vectors for document {document_id}")
            except Exception as e:
                logger.error(f"Failed to delete vectors for document {document_id}: {e}")
        
        background_tasks.add_task(delete_vectors)
    
    # 删除数据库记录（级联删除切片）
    await db.delete(document)
    await db.commit()
    
    return ApiResponse(message="文献删除成功")


@router.get(
    "/{document_id}/chunks",
    response_model=ApiResponse[list[ChunkResponse]],
    summary="获取文献切片"
)
async def get_document_chunks(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取指定文献的所有切片"""
    
    # 验证文献存在
    doc_result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文献不存在"
        )
    
    # 获取切片
    result = await db.execute(
        select(Chunk)
        .where(Chunk.document_id == document_id)
        .order_by(Chunk.chunk_index)
    )
    chunks = result.scalars().all()
    
    return ApiResponse(
        data=[ChunkResponse(
            id=chunk.id,
            document_id=chunk.document_id,
            content=chunk.content,
            page_number=chunk.page_number,
            section_title=chunk.section_title,
            chunk_index=chunk.chunk_index
        ) for chunk in chunks]
    )


@router.get(
    "/pdf/{document_id}",
    summary="获取 PDF 文件",
    response_class=FileResponse
)
async def get_document_pdf(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    获取文献的 PDF 文件
    
    返回 PDF 文件流，可直接在浏览器中预览
    """
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文献不存在"
        )
    
    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF 文件不存在"
        )
    
    return FileResponse(
        path=document.file_path,
        media_type="application/pdf",
        filename=f"{document.title}.pdf"
    )

