"""
引用回溯路由
"""

import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.document import Document, Chunk
from app.schemas.common import ApiResponse
from pydantic import BaseModel
from typing import List, Optional


router = APIRouter(prefix="/api/citations", tags=["citations"])


class CitationDetail(BaseModel):
    """引用详情响应"""
    chunk_id: str
    document_id: str
    document_title: str
    authors: List[str]
    year: Optional[int]
    page_number: int
    content: str
    section_title: Optional[str]
    file_path: str
    # 用于前端构建PDF URL
    pdf_url: str


class CitationLookupRequest(BaseModel):
    """批量查询引用请求"""
    chunk_ids: List[str]


@router.get(
    "/chunk/{chunk_id}",
    response_model=ApiResponse[CitationDetail],
    summary="获取引用详情"
)
async def get_citation_detail(
    chunk_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    根据 chunk_id 获取引用的详细信息，包括：
    - 文献元数据（标题、作者、年份）
    - 页码位置
    - 原文内容
    - PDF 文件路径
    """
    # 查询 chunk 及其关联的 document
    result = await db.execute(
        select(Chunk, Document)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.id == chunk_id)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="引用不存在"
        )
    
    chunk, document = row
    
    # 构建 PDF URL（相对路径）
    file_name = os.path.basename(document.file_path)
    pdf_url = f"/api/documents/pdf/{document.id}"
    
    return ApiResponse(
        data=CitationDetail(
            chunk_id=chunk.id,
            document_id=document.id,
            document_title=document.title,
            authors=document.authors or [],
            year=document.year,
            page_number=chunk.page_number,
            content=chunk.content,
            section_title=chunk.section_title,
            file_path=document.file_path,
            pdf_url=pdf_url
        )
    )


@router.post(
    "/lookup",
    response_model=ApiResponse[List[CitationDetail]],
    summary="批量查询引用"
)
async def lookup_citations(
    request: CitationLookupRequest,
    db: AsyncSession = Depends(get_db)
):
    """批量查询多个引用的详细信息"""
    
    if not request.chunk_ids:
        return ApiResponse(data=[])
    
    # 批量查询
    result = await db.execute(
        select(Chunk, Document)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.id.in_(request.chunk_ids))
    )
    rows = result.all()
    
    citations = []
    for chunk, document in rows:
        pdf_url = f"/api/documents/pdf/{document.id}"
        citations.append(CitationDetail(
            chunk_id=chunk.id,
            document_id=document.id,
            document_title=document.title,
            authors=document.authors or [],
            year=document.year,
            page_number=chunk.page_number,
            content=chunk.content,
            section_title=chunk.section_title,
            file_path=document.file_path,
            pdf_url=pdf_url
        ))
    
    return ApiResponse(data=citations)
