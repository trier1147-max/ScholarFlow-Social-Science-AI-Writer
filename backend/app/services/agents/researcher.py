"""
Researcher Agent
负责从向量库检索相关文献证据
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

from app.services.vector_store import get_vector_store, SearchResult

logger = logging.getLogger(__name__)


@dataclass
class Evidence:
    """证据卡片"""
    chunk_id: str
    document_id: str
    document_title: str
    authors: List[str]
    year: Optional[int]
    content: str
    page_number: int
    section_title: Optional[str]
    relevance_score: float
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    def format_citation(self, index: int) -> str:
        """格式化引用"""
        author_str = self.authors[0] if self.authors else "Unknown"
        if len(self.authors) > 1:
            author_str += " et al."
        year_str = str(self.year) if self.year else "n.d."
        return f"[^{index}]: {author_str} ({year_str}), p.{self.page_number}"


class ResearcherAgent:
    """
    研究员 Agent
    
    职责：
    - 从向量库中检索与用户问题最相关的文献片段
    - 返回结构化的证据卡片列表
    """
    
    def __init__(self, top_k: int = 5, min_relevance: float = 0.3):
        """
        初始化研究员 Agent
        
        Args:
            top_k: 返回最相关的 k 个结果
            min_relevance: 最小相关度阈值
        """
        self.top_k = top_k
        self.min_relevance = min_relevance
        self.vector_store = get_vector_store()
    
    async def search(
        self,
        query: str,
        document_ids: List[str],
        top_k: int = None
    ) -> List[Evidence]:
        """
        检索相关证据
        
        Args:
            query: 用户问题
            document_ids: 限制在这些文献中检索
            top_k: 返回结果数量（覆盖默认值）
            
        Returns:
            证据卡片列表，按相关度排序
        """
        if not document_ids:
            logger.warning("No document_ids provided for search")
            return []
        
        k = top_k or self.top_k
        
        logger.info(f"Searching for: '{query[:50]}...' in {len(document_ids)} documents")
        
        # 执行向量检索
        search_results = await self.vector_store.search(
            query=query,
            document_ids=document_ids,
            n_results=k * 2,  # 多检索一些，后面可能会过滤
            min_score=self.min_relevance
        )
        
        # 转换为证据卡片
        evidence_list = []
        for result in search_results[:k]:
            evidence = self._convert_to_evidence(result)
            evidence_list.append(evidence)
        
        logger.info(f"Found {len(evidence_list)} relevant evidence pieces")
        
        return evidence_list
    
    def _convert_to_evidence(self, result: SearchResult) -> Evidence:
        """将检索结果转换为证据卡片"""
        metadata = result.metadata
        
        # 解析作者
        authors_str = metadata.get("doc_authors", "")
        authors = [a.strip() for a in authors_str.split(",") if a.strip()]
        
        # 解析年份
        year = metadata.get("doc_year")
        if year == 0:
            year = None
        
        return Evidence(
            chunk_id=result.chunk_id,
            document_id=result.document_id,
            document_title=metadata.get("doc_title", "Untitled"),
            authors=authors,
            year=year,
            content=result.content,
            page_number=result.page_number,
            section_title=result.section_title,
            relevance_score=result.score
        )
    
    async def search_with_expansion(
        self,
        query: str,
        document_ids: List[str],
        expand_context: bool = True
    ) -> List[Evidence]:
        """
        带查询扩展的检索
        
        Args:
            query: 用户问题
            document_ids: 文献ID列表
            expand_context: 是否扩展上下文（获取相邻切片）
            
        Returns:
            证据卡片列表
        """
        # 基础检索
        evidence_list = await self.search(query, document_ids)
        
        if not expand_context or not evidence_list:
            return evidence_list
        
        # TODO: 可以在这里实现上下文扩展
        # 例如获取每个证据的前后切片，提供更完整的上下文
        
        return evidence_list
    
    def format_evidence_for_prompt(
        self,
        evidence_list: List[Evidence]
    ) -> str:
        """
        将证据格式化为 Prompt 中使用的格式
        
        Args:
            evidence_list: 证据列表
            
        Returns:
            格式化的证据文本
        """
        if not evidence_list:
            return "No relevant evidence found in the provided documents."
        
        formatted_parts = []
        
        for i, evidence in enumerate(evidence_list, 1):
            author_str = evidence.authors[0] if evidence.authors else "Unknown"
            if len(evidence.authors) > 1:
                author_str += " et al."
            
            year_str = str(evidence.year) if evidence.year else "n.d."
            
            section_info = f" [{evidence.section_title}]" if evidence.section_title else ""
            
            formatted_parts.append(
                f"[Evidence {i}] (Source: {author_str}, {year_str}, p.{evidence.page_number}{section_info})\n"
                f"{evidence.content}\n"
            )
        
        return "\n---\n".join(formatted_parts)
