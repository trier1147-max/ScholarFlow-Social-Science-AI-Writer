"""
通用 Schemas
"""

from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """通用 API 响应"""
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[dict] = None


class ErrorDetail(BaseModel):
    """错误详情"""
    code: str
    message: str


class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    error: ErrorDetail


class PaginationParams(BaseModel):
    """分页参数"""
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")


class PaginationInfo(BaseModel):
    """分页信息"""
    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应"""
    success: bool = True
    data: List[T]
    pagination: PaginationInfo

