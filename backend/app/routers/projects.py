"""
项目管理路由
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.database import get_db
from app.models.project import Project, ProjectDocument
from app.models.document import Document
from app.models.draft import Draft
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectDocumentAdd,
    ProjectDocumentRemove,
    ProjectDocumentResponse
)
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationInfo

router = APIRouter(prefix="/api/projects", tags=["projects"])
logger = logging.getLogger(__name__)


@router.post(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建项目"
)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建新项目"""
    project = Project(
        title=data.title,
        description=data.description
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    return ApiResponse(
        success=True,
        data=ProjectResponse(
            id=project.id,
            title=project.title,
            description=project.description,
            document_count=0,
            draft_count=0,
            created_at=project.created_at,
            updated_at=project.updated_at
        ).model_dump(),
        message="项目创建成功"
    )


@router.get(
    "",
    response_model=PaginatedResponse,
    summary="获取项目列表"
)
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取项目列表（带分页）"""
    # 构建查询
    query = select(Project)
    
    if search:
        query = query.where(Project.title.ilike(f"%{search}%"))
    
    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # 分页查询
    query = query.order_by(Project.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    # 获取每个项目的文献和草稿数量
    project_list = []
    for project in projects:
        # 文献数量
        doc_count_query = select(func.count()).where(
            ProjectDocument.project_id == project.id
        )
        doc_count_result = await db.execute(doc_count_query)
        doc_count = doc_count_result.scalar() or 0
        
        # 草稿数量
        draft_count_query = select(func.count()).where(
            Draft.project_id == project.id
        )
        draft_count_result = await db.execute(draft_count_query)
        draft_count = draft_count_result.scalar() or 0
        
        project_list.append(ProjectListResponse(
            id=project.id,
            title=project.title,
            description=project.description,
            document_count=doc_count,
            draft_count=draft_count,
            created_at=project.created_at,
            updated_at=project.updated_at
        ).model_dump())
    
    return PaginatedResponse(
        success=True,
        data=project_list,
        pagination=PaginationInfo(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size
        )
    )


@router.get(
    "/{project_id}",
    response_model=ApiResponse,
    summary="获取项目详情"
)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取单个项目详情"""
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 获取文献数量
    doc_count_query = select(func.count()).where(
        ProjectDocument.project_id == project.id
    )
    doc_count_result = await db.execute(doc_count_query)
    doc_count = doc_count_result.scalar() or 0
    
    # 获取草稿数量
    draft_count_query = select(func.count()).where(
        Draft.project_id == project.id
    )
    draft_count_result = await db.execute(draft_count_query)
    draft_count = draft_count_result.scalar() or 0
    
    return ApiResponse(
        success=True,
        data=ProjectResponse(
            id=project.id,
            title=project.title,
            description=project.description,
            document_count=doc_count,
            draft_count=draft_count,
            created_at=project.created_at,
            updated_at=project.updated_at
        ).model_dump()
    )


@router.patch(
    "/{project_id}",
    response_model=ApiResponse,
    summary="更新项目"
)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新项目信息"""
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    if data.title is not None:
        project.title = data.title
    if data.description is not None:
        project.description = data.description
    
    await db.commit()
    await db.refresh(project)
    
    return ApiResponse(
        success=True,
        data=project.to_dict(),
        message="项目更新成功"
    )


@router.delete(
    "/{project_id}",
    response_model=ApiResponse,
    summary="删除项目"
)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除项目（不会删除关联的文献，只解除关联）"""
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 删除项目（级联删除会处理 project_documents 关联）
    await db.delete(project)
    await db.commit()
    
    return ApiResponse(
        success=True,
        message="项目删除成功"
    )


# ============ 项目文献管理 ============

@router.get(
    "/{project_id}/documents",
    response_model=ApiResponse,
    summary="获取项目文献列表"
)
async def get_project_documents(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取项目关联的所有文献"""
    # 验证项目存在
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 获取项目文献
    query = (
        select(Document, ProjectDocument.added_at)
        .join(ProjectDocument, Document.id == ProjectDocument.document_id)
        .where(ProjectDocument.project_id == project_id)
        .order_by(ProjectDocument.added_at.desc())
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    documents = []
    for doc, added_at in rows:
        documents.append({
            "id": doc.id,
            "title": doc.title,
            "authors": doc.authors,
            "year": doc.year,
            "source": doc.source,
            "abstract": doc.abstract,
            "page_count": doc.page_count,
            "added_at": added_at.isoformat(),
            "created_at": doc.created_at.isoformat()
        })
    
    return ApiResponse(
        success=True,
        data=documents
    )


@router.post(
    "/{project_id}/documents",
    response_model=ApiResponse,
    summary="添加文献到项目"
)
async def add_documents_to_project(
    project_id: str,
    data: ProjectDocumentAdd,
    db: AsyncSession = Depends(get_db)
):
    """将文献添加到项目"""
    # 验证项目存在
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    added_count = 0
    for doc_id in data.document_ids:
        # 检查文献是否存在
        doc_result = await db.execute(
            select(Document).where(Document.id == doc_id)
        )
        if not doc_result.scalar_one_or_none():
            continue
        
        # 检查是否已关联
        existing = await db.execute(
            select(ProjectDocument).where(
                ProjectDocument.project_id == project_id,
                ProjectDocument.document_id == doc_id
            )
        )
        if existing.scalar_one_or_none():
            continue
        
        # 创建关联
        project_doc = ProjectDocument(
            project_id=project_id,
            document_id=doc_id
        )
        db.add(project_doc)
        added_count += 1
    
    await db.commit()
    
    return ApiResponse(
        success=True,
        message=f"成功添加 {added_count} 篇文献到项目"
    )


@router.delete(
    "/{project_id}/documents",
    response_model=ApiResponse,
    summary="从项目移除文献"
)
async def remove_documents_from_project(
    project_id: str,
    data: ProjectDocumentRemove,
    db: AsyncSession = Depends(get_db)
):
    """从项目中移除文献（不删除文献本身）"""
    # 验证项目存在
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 删除关联
    await db.execute(
        delete(ProjectDocument).where(
            ProjectDocument.project_id == project_id,
            ProjectDocument.document_id.in_(data.document_ids)
        )
    )
    await db.commit()
    
    return ApiResponse(
        success=True,
        message="文献已从项目中移除"
    )
