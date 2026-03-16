"""
草稿模型
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Draft(Base):
    """草稿模型"""
    
    __tablename__ = "drafts"
    
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(500), default="未命名草稿")
    content: Mapped[str] = mapped_column(Text, default="")
    # 纯文本内容（用于字数统计和搜索）
    plain_text: Mapped[str] = mapped_column(Text, default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    # 版本号（每次保存递增）
    version: Mapped[int] = mapped_column(Integer, default=1)
    # 关联的项目 ID（可选）
    project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow
    )
    
    def __repr__(self) -> str:
        return f"<Draft(id={self.id}, title={self.title[:30]})>"
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "plain_text": self.plain_text,
            "word_count": self.word_count,
            "version": self.version,
            "project_id": self.project_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
