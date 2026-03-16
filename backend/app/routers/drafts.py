"""
草稿管理路由
"""

import re
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.draft import Draft
from app.schemas.draft import (
    DraftCreate,
    DraftUpdate,
    DraftAutoSave,
    DraftResponse,
    DraftListResponse
)
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationInfo

router = APIRouter(prefix="/api/drafts", tags=["drafts"])
logger = logging.getLogger(__name__)


def html_to_plain_text(html: str) -> str:
    """将 HTML 转换为纯文本"""
    if not html:
        return ""
    # 移除 HTML 标签
    text = re.sub(r'<[^>]+>', '', html)
    # 解码常见的 HTML 实体
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&amp;', '&')
    text = text.replace('&quot;', '"')
    # 移除多余空白
    text = re.sub(r'\s+', ' ', text).strip()
    return text


@router.post(
    "",
    response_model=ApiResponse[DraftResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建草稿"
)
async def create_draft(
    request: DraftCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建新草稿"""
    plain_text = html_to_plain_text(request.content)
    
    draft = Draft(
        title=request.title,
        content=request.content,
        plain_text=plain_text,
        word_count=len(plain_text),
        project_id=request.project_id
    )
    
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    
    return ApiResponse(
        data=DraftResponse(
            id=draft.id,
            title=draft.title,
            content=draft.content,
            plain_text=draft.plain_text,
            word_count=draft.word_count,
            version=draft.version,
            project_id=draft.project_id,
            created_at=draft.created_at,
            updated_at=draft.updated_at
        ),
        message="草稿创建成功"
    )


@router.get(
    "",
    response_model=PaginatedResponse[DraftListResponse],
    summary="获取草稿列表"
)
async def list_drafts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    project_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db)
):
    """获取草稿列表，支持分页和项目筛选"""
    
    # 构建查询
    query = select(Draft)
    count_query = select(func.count(Draft.id))
    
    # 项目筛选
    if project_id:
        query = query.where(Draft.project_id == project_id)
        count_query = count_query.where(Draft.project_id == project_id)
    
    # 排序（最近更新的在前）
    query = query.order_by(Draft.updated_at.desc())
    
    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # 分页
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # 执行查询
    result = await db.execute(query)
    drafts = result.scalars().all()
    
    draft_list = [
        DraftListResponse(
            id=draft.id,
            title=draft.title,
            word_count=draft.word_count,
            version=draft.version,
            project_id=draft.project_id,
            created_at=draft.created_at,
            updated_at=draft.updated_at
        )
        for draft in drafts
    ]
    
    return PaginatedResponse(
        data=draft_list,
        pagination=PaginationInfo(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size
        )
    )


@router.get(
    "/latest",
    response_model=ApiResponse[DraftResponse],
    summary="获取最新草稿"
)
async def get_latest_draft(
    project_id: Optional[str] = Query(default=None, description="项目 ID，用于获取项目内最新草稿"),
    db: AsyncSession = Depends(get_db)
):
    """获取最近更新的草稿（用于恢复编辑状态）"""
    
    # 构建查询
    query = select(Draft)
    if project_id:
        query = query.where(Draft.project_id == project_id)
    query = query.order_by(Draft.updated_at.desc()).limit(1)
    
    result = await db.execute(query)
    draft = result.scalar_one_or_none()
    
    if not draft:
        # 如果没有草稿，创建一个空草稿（关联项目）
        draft = Draft(
            title="未命名草稿", 
            content="", 
            plain_text="",
            project_id=project_id
        )
        db.add(draft)
        await db.commit()
        await db.refresh(draft)
    
    return ApiResponse(
        data=DraftResponse(
            id=draft.id,
            title=draft.title,
            content=draft.content,
            plain_text=draft.plain_text,
            word_count=draft.word_count,
            version=draft.version,
            project_id=draft.project_id,
            created_at=draft.created_at,
            updated_at=draft.updated_at
        )
    )


@router.get(
    "/{draft_id}",
    response_model=ApiResponse[DraftResponse],
    summary="获取草稿详情"
)
async def get_draft(
    draft_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取指定草稿的详情"""
    
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="草稿不存在"
        )
    
    return ApiResponse(
        data=DraftResponse(
            id=draft.id,
            title=draft.title,
            content=draft.content,
            plain_text=draft.plain_text,
            word_count=draft.word_count,
            version=draft.version,
            project_id=draft.project_id,
            created_at=draft.created_at,
            updated_at=draft.updated_at
        )
    )


@router.put(
    "/{draft_id}",
    response_model=ApiResponse[DraftResponse],
    summary="更新草稿"
)
async def update_draft(
    draft_id: str,
    request: DraftUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新草稿内容"""
    
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="草稿不存在"
        )
    
    # 更新字段
    if request.title is not None:
        draft.title = request.title
    
    if request.content is not None:
        draft.content = request.content
        draft.plain_text = html_to_plain_text(request.content)
        draft.word_count = len(draft.plain_text)
    
    # 递增版本号
    draft.version += 1
    
    await db.commit()
    await db.refresh(draft)
    
    return ApiResponse(
        data=DraftResponse(
            id=draft.id,
            title=draft.title,
            content=draft.content,
            plain_text=draft.plain_text,
            word_count=draft.word_count,
            version=draft.version,
            project_id=draft.project_id,
            created_at=draft.created_at,
            updated_at=draft.updated_at
        ),
        message="草稿保存成功"
    )


@router.post(
    "/{draft_id}/autosave",
    response_model=ApiResponse[DraftResponse],
    summary="自动保存草稿"
)
async def autosave_draft(
    draft_id: str,
    request: DraftAutoSave,
    db: AsyncSession = Depends(get_db)
):
    """
    自动保存草稿（轻量级端点）
    
    仅更新内容，不重置其他属性
    """
    
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()
    
    if not draft:
        # 如果草稿不存在，创建新草稿
        plain_text = html_to_plain_text(request.content)
        draft = Draft(
            id=draft_id,
            title=request.title or "未命名草稿",
            content=request.content,
            plain_text=plain_text,
            word_count=len(plain_text),
            project_id=request.project_id
        )
        db.add(draft)
    else:
        # 更新现有草稿
        draft.content = request.content
        draft.plain_text = html_to_plain_text(request.content)
        draft.word_count = len(draft.plain_text)
        if request.title:
            draft.title = request.title
        draft.version += 1
    
    await db.commit()
    await db.refresh(draft)
    
    logger.debug(f"Autosaved draft {draft.id}, version {draft.version}")
    
    return ApiResponse(
        data=DraftResponse(
            id=draft.id,
            title=draft.title,
            content=draft.content,
            plain_text=draft.plain_text,
            word_count=draft.word_count,
            version=draft.version,
            project_id=draft.project_id,
            created_at=draft.created_at,
            updated_at=draft.updated_at
        )
    )


@router.delete(
    "/{draft_id}",
    response_model=ApiResponse,
    summary="删除草稿"
)
async def delete_draft(
    draft_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除指定草稿"""
    
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="草稿不存在"
        )
    
    await db.delete(draft)
    await db.commit()
    
    return ApiResponse(message="草稿删除成功")
