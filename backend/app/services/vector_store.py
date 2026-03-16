"""
向量存储服务
使用 Chroma 作为向量数据库
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings
from app.services.embedding import get_embedding_service

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """检索结果"""
    chunk_id: str
    document_id: str
    content: str
    page_number: int
    section_title: Optional[str]
    score: float
    metadata: Dict[str, Any]


class VectorStore:
    """向量存储服务"""
    
    COLLECTION_NAME = "document_chunks"
    
    def __init__(self, persist_directory: str = None):
        """
        初始化向量存储
        
        Args:
            persist_directory: 持久化目录路径
        """
        self.persist_directory = persist_directory or str(settings.chroma_path)
        self._client = None
        self._collection = None
        self._embedding_service = None
    
    def _get_client(self) -> chromadb.ClientAPI:
        """获取 Chroma 客户端"""
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
        return self._client
    
    def _get_collection(self) -> chromadb.Collection:
        """获取或创建集合"""
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}  # 使用余弦相似度
            )
        return self._collection
    
    def _get_embedding_service(self):
        """获取 Embedding 服务"""
        if self._embedding_service is None:
            self._embedding_service = get_embedding_service(
                model_name=settings.EMBEDDING_MODEL,
                device=settings.EMBEDDING_DEVICE
            )
        return self._embedding_service
    
    async def add_chunks(
        self,
        document_id: str,
        chunks: List[Dict[str, Any]],
        document_metadata: Dict[str, Any] = None
    ) -> int:
        """
        添加文献切片到向量库
        
        Args:
            document_id: 文献ID
            chunks: 切片列表，每个切片包含 id, content, page_number, section_title 等
            document_metadata: 文献元数据（标题、作者等）
            
        Returns:
            添加的切片数量
        """
        if not chunks:
            return 0
        
        collection = self._get_collection()
        embedding_service = self._get_embedding_service()
        
        # 准备数据
        ids = []
        documents = []
        metadatas = []
        
        for chunk in chunks:
            chunk_id = chunk.get("id") or f"{document_id}_{chunk['chunk_index']}"
            ids.append(chunk_id)
            documents.append(chunk["content"])
            
            # 构建元数据
            meta = {
                "document_id": document_id,
                "chunk_index": chunk.get("chunk_index", 0),
                "page_number": chunk.get("page_number", 1),
                "section_title": chunk.get("section_title") or "",
                "char_start": chunk.get("char_start", 0),
                "char_end": chunk.get("char_end", 0),
            }
            
            # 添加文献元数据
            if document_metadata:
                meta["doc_title"] = document_metadata.get("title", "")
                meta["doc_authors"] = ", ".join(document_metadata.get("authors", []))
                meta["doc_year"] = document_metadata.get("year") or 0
            
            metadatas.append(meta)
        
        # 生成向量
        logger.info(f"Generating embeddings for {len(documents)} chunks...")
        embeddings = embedding_service.embed_texts(documents)
        
        # 添加到集合
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        
        logger.info(f"Added {len(ids)} chunks for document {document_id}")
        return len(ids)
    
    async def search(
        self,
        query: str,
        document_ids: List[str] = None,
        n_results: int = 5,
        min_score: float = 0.3
    ) -> List[SearchResult]:
        """
        语义检索相关切片
        
        Args:
            query: 查询文本
            document_ids: 限制在这些文献中检索（为空则检索全部）
            n_results: 返回结果数量
            min_score: 最小相似度分数
            
        Returns:
            检索结果列表
        """
        collection = self._get_collection()
        embedding_service = self._get_embedding_service()
        
        # 生成查询向量
        query_embedding = embedding_service.embed_query(query)
        
        # 构建过滤条件
        where_filter = None
        if document_ids:
            if len(document_ids) == 1:
                where_filter = {"document_id": document_ids[0]}
            else:
                where_filter = {"document_id": {"$in": document_ids}}
        
        # 执行检索
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )
        
        # 转换结果
        search_results = []
        
        if results["ids"] and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                # Chroma 返回的是距离，需要转换为相似度分数
                # 对于余弦距离，score = 1 - distance
                distance = results["distances"][0][i]
                score = 1 - distance
                
                if score < min_score:
                    continue
                
                metadata = results["metadatas"][0][i]
                
                search_results.append(SearchResult(
                    chunk_id=chunk_id,
                    document_id=metadata.get("document_id", ""),
                    content=results["documents"][0][i],
                    page_number=metadata.get("page_number", 1),
                    section_title=metadata.get("section_title") or None,
                    score=score,
                    metadata=metadata
                ))
        
        # 按分数排序
        search_results.sort(key=lambda x: x.score, reverse=True)
        
        return search_results
    
    async def delete_document(self, document_id: str) -> int:
        """
        删除文献的所有向量数据
        
        Args:
            document_id: 文献ID
            
        Returns:
            删除的切片数量
        """
        collection = self._get_collection()
        
        # 先查询该文献的所有切片
        results = collection.get(
            where={"document_id": document_id},
            include=["metadatas"]
        )
        
        if not results["ids"]:
            return 0
        
        # 删除
        collection.delete(ids=results["ids"])
        
        logger.info(f"Deleted {len(results['ids'])} chunks for document {document_id}")
        return len(results["ids"])
    
    async def get_document_chunks(
        self,
        document_id: str
    ) -> List[Dict[str, Any]]:
        """
        获取文献的所有切片
        
        Args:
            document_id: 文献ID
            
        Returns:
            切片列表
        """
        collection = self._get_collection()
        
        results = collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"]
        )
        
        chunks = []
        if results["ids"]:
            for i, chunk_id in enumerate(results["ids"]):
                chunks.append({
                    "id": chunk_id,
                    "content": results["documents"][i],
                    "metadata": results["metadatas"][i]
                })
        
        # 按 chunk_index 排序
        chunks.sort(key=lambda x: x["metadata"].get("chunk_index", 0))
        
        return chunks
    
    def get_stats(self) -> Dict[str, Any]:
        """获取向量库统计信息"""
        collection = self._get_collection()
        return {
            "collection_name": self.COLLECTION_NAME,
            "total_chunks": collection.count(),
            "persist_directory": self.persist_directory
        }


# 单例
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    """获取向量存储单例"""
    global _vector_store
    
    if _vector_store is None:
        _vector_store = VectorStore()
    
    return _vector_store
