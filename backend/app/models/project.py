"""
项目相关模型
"""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


# 项目-文献关联表
class ProjectDocument(Base):
    """项目文献关联模型"""
    
    __tablename__ = "project_documents"
    
    project_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True
    )
    document_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True
    )
    added_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )


class Project(Base):
    """项目模型"""
    
    __tablename__ = "projects"
    
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation",
        backref="project",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Project(id={self.id}, title={self.title})>"
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


# 导入 Conversation 用于类型提示
from app.models.conversation import Conversation

