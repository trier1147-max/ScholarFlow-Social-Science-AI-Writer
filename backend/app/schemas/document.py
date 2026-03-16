"""
文献相关 Schemas
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    """文献基础模型"""
    title: str = Field(..., min_length=1, max_length=1000)
    authors: List[str] = Field(default_factory=list)
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    source: Optional[str] = Field(default=None, max_length=500)
    abstract: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)


class DocumentCreate(DocumentBase):
    """创建文献"""
    pass


class DocumentUpdate(BaseModel):
    """更新文献"""
    title: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    authors: Optional[List[str]] = None
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    source: Optional[str] = Field(default=None, max_length=500)
    abstract: Optional[str] = None
    keywords: Optional[List[str]] = None


class DocumentResponse(DocumentBase):
    """文献响应"""
    id: str
    file_path: str
    page_count: int = 0
    chunk_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """文献列表响应"""
    id: str
    title: str
    authors: List[str]
    year: Optional[int]
    source: Optional[str]
    chunk_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ChunkResponse(BaseModel):
    """切片响应"""
    id: str
    document_id: str
    content: str
    page_number: int
    section_title: Optional[str]
    chunk_index: int

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    """文献上传响应"""
    success: bool = True
    data: DocumentResponse
    message: str = "文献上传成功"

