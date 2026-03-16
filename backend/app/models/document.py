"""
文献相关模型
"""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Document(Base):
    """文献模型"""
    
    __tablename__ = "documents"
    
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(1000), nullable=False)
    authors: Mapped[List[str]] = mapped_column(JSON, default=list)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    abstract: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    keywords: Mapped[List[str]] = mapped_column(JSON, default=list)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
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
    chunks: Mapped[List["Chunk"]] = relationship(
        "Chunk", 
        back_populates="document",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Document(id={self.id}, title={self.title[:50]})>"
    
    @property
    def chunk_count(self) -> int:
        """获取切片数量"""
        return len(self.chunks) if self.chunks else 0
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "title": self.title,
            "authors": self.authors,
            "year": self.year,
            "source": self.source,
            "abstract": self.abstract,
            "keywords": self.keywords,
            "file_path": self.file_path,
            "page_count": self.page_count,
            "chunk_count": self.chunk_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class Chunk(Base):
    """文献切片模型"""
    
    __tablename__ = "chunks"
    
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    section_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    char_start: Mapped[int] = mapped_column(Integer, default=0)
    char_end: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    
    # 关系
    document: Mapped["Document"] = relationship(
        "Document", 
        back_populates="chunks"
    )
    
    def __repr__(self) -> str:
        return f"<Chunk(id={self.id}, document_id={self.document_id})>"
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "document_id": self.document_id,
            "content": self.content,
            "page_number": self.page_number,
            "section_title": self.section_title,
            "chunk_index": self.chunk_index,
            "created_at": self.created_at.isoformat()
        }

