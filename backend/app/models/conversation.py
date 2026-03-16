"""
对话相关模型
"""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class MessageRole(str, enum.Enum):
    """消息角色"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(Base):
    """对话模型"""
    
    __tablename__ = "conversations"
    
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True
    )
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow
    )
    
    # 关系
    messages: Mapped[List["Message"]] = relationship(
        "Message", 
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at"
    )
    
    def __repr__(self) -> str:
        return f"<Conversation(id={self.id})>"
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "title": self.title,
            "message_count": len(self.messages) if self.messages else 0,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class Message(Base):
    """消息模型"""
    
    __tablename__ = "messages"
    
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    conversation_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False
    )
    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole), 
        nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[Optional[List[dict]]] = mapped_column(JSON, nullable=True)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    
    # 关系
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", 
        back_populates="messages"
    )
    
    def __repr__(self) -> str:
        return f"<Message(id={self.id}, role={self.role})>"
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role.value,
            "content": self.content,
            "citations": self.citations,
            "created_at": self.created_at.isoformat()
        }

