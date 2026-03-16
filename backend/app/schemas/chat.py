"""
对话相关 Schemas
"""

from typing import List, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class Citation(BaseModel):
    """引用信息"""
    index: int
    chunk_id: str
    document_id: str
    document_title: str
    authors: List[str] = []
    year: Optional[int] = None
    page_number: int
    text: str


class ChatRequest(BaseModel):
    """对话请求"""
    message: str = Field(..., min_length=1, max_length=10000)
    document_ids: List[str] = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    project_id: Optional[str] = None  # 关联的项目 ID
    mode: Literal["strict", "explore"] = "strict"


class ConversationListResponse(BaseModel):
    """对话列表项响应"""
    id: str
    project_id: Optional[str]
    title: Optional[str]
    message_count: int = 0
    last_message_preview: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """消息响应"""
    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    citations: Optional[List[Citation]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    """对话响应（非流式）"""
    success: bool = True
    conversation_id: str
    message: MessageResponse


class ConversationResponse(BaseModel):
    """对话详情响应"""
    id: str
    project_id: Optional[str]
    title: Optional[str]
    messages: List[MessageResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# SSE 事件类型
class SSEStartEvent(BaseModel):
    """开始事件"""
    conversation_id: str
    message_id: str


class SSEAgentEvent(BaseModel):
    """Agent 状态事件"""
    agent: Literal["researcher", "writer", "editor"]
    status: Literal["idle", "working", "done", "error"]
    detail: Optional[str] = None


class SSEContentEvent(BaseModel):
    """内容事件"""
    text: str


class SSECitationEvent(BaseModel):
    """引用事件"""
    index: int
    document_id: str
    page: int
    text: str


class SSEDoneEvent(BaseModel):
    """完成事件"""
    total_tokens: int = 0
    citations: List[Citation] = []


class SSEErrorEvent(BaseModel):
    """错误事件"""
    code: str
    message: str

