"""
草稿相关 Schemas
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DraftCreate(BaseModel):
    """创建草稿请求"""
    title: str = Field(default="未命名草稿", max_length=500)
    content: str = Field(default="")
    project_id: Optional[str] = None


class DraftUpdate(BaseModel):
    """更新草稿请求"""
    title: Optional[str] = Field(default=None, max_length=500)
    content: Optional[str] = None


class DraftAutoSave(BaseModel):
    """自动保存请求"""
    content: str
    title: Optional[str] = None
    project_id: Optional[str] = None  # 关联的项目 ID


class DraftResponse(BaseModel):
    """草稿响应"""
    id: str
    title: str
    content: str
    plain_text: str
    word_count: int
    version: int
    project_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DraftListResponse(BaseModel):
    """草稿列表项响应"""
    id: str
    title: str
    word_count: int
    version: int
    project_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
