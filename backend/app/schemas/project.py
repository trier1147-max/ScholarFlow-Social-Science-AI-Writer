"""
项目相关 Pydantic schemas
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """创建项目请求"""
    title: str = Field(..., min_length=1, max_length=500, description="项目标题")
    description: Optional[str] = Field(None, max_length=2000, description="项目描述")


class ProjectUpdate(BaseModel):
    """更新项目请求"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)


class ProjectResponse(BaseModel):
    """项目响应"""
    id: str
    title: str
    description: Optional[str]
    document_count: int = 0
    draft_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """项目列表项响应"""
    id: str
    title: str
    description: Optional[str]
    document_count: int = 0
    draft_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDocumentAdd(BaseModel):
    """添加文献到项目"""
    document_ids: List[str] = Field(..., min_length=1, description="文献 ID 列表")


class ProjectDocumentRemove(BaseModel):
    """从项目移除文献"""
    document_ids: List[str] = Field(..., min_length=1, description="文献 ID 列表")


class ProjectDocumentResponse(BaseModel):
    """项目文献响应"""
    id: str
    title: str
    authors: List[str]
    year: Optional[int]
    added_at: datetime

    class Config:
        from_attributes = True
