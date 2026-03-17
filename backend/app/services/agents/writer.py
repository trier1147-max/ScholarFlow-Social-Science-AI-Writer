"""
Writer Agent
负责基于证据撰写学术内容
"""

import logging
from typing import List, AsyncGenerator

from app.services.llm import get_llm_service, Message, LLMResponse
from app.services.agents.researcher import Evidence

logger = logging.getLogger(__name__)


# 学术写作系统提示
WRITER_SYSTEM_PROMPT = """你是 ScholarFlow，一位智能学术写作助手，专注于人文社科领域。你能自然地与用户对话，也能提供深度的学术支持。

## 行为准则

**根据情境灵活响应：**

1. **日常对话**（如问候、闲聊、简单提问）：自然、友好地回复，无需引用文献。

2. **有文献证据时**：优先基于提供的文献证据回答，适当引用，格式为 [^n]。若证据与问题高度相关，以证据为主；若相关性有限，可结合自身知识补充，并说明哪些内容来自文献，哪些来自通识。

3. **无文献证据时**：直接基于自身知识回答，无需解释"没有证据"。如果是需要文献支撑的深度学术问题，可在回答后友好提示用户上传相关文献以获得更精准的引用支持。

## 引用格式（仅有文献证据时使用）

- 引用证据时在内容后标注 [^n]，n 为证据编号
- 多来源可写 [^1][^2]

## 语言与风格

- 日常对话用自然语言；学术写作用正式学术语言
- 始终保持友好、专业、有帮助的态度
- 回答长度匹配问题复杂度，不强求冗长"""


class WriterAgent:
    """
    写手 Agent
    
    职责：
    - 基于 Researcher 提供的证据撰写学术内容
    - 确保内容有据可查，并正确标注引用
    """
    
    def __init__(self, temperature: float = 0.7):
        """
        初始化写手 Agent
        
        Args:
            temperature: LLM 温度参数
        """
        self.temperature = temperature
        self.llm = get_llm_service()
    
    async def write(
        self,
        query: str,
        evidence_list: List[Evidence],
        context: str = None
    ) -> LLMResponse:
        """
        基于证据撰写内容
        
        Args:
            query: 用户问题/写作要求
            evidence_list: 证据列表
            context: 额外上下文（如对话历史）
            
        Returns:
            LLM 响应
        """
        # 构建消息
        messages = self._build_messages(query, evidence_list, context)
        
        logger.info(f"Writer generating response for: '{query[:50]}...'")
        
        # 调用 LLM
        response = await self.llm.chat(
            messages=messages,
            temperature=self.temperature,
            max_tokens=2000
        )
        
        return response
    
    async def write_stream(
        self,
        query: str,
        evidence_list: List[Evidence],
        context: str = None
    ) -> AsyncGenerator[str, None]:
        """
        流式撰写内容
        
        Args:
            query: 用户问题/写作要求
            evidence_list: 证据列表
            context: 额外上下文
            
        Yields:
            生成的文本片段
        """
        messages = self._build_messages(query, evidence_list, context)
        
        logger.info(f"Writer streaming response for: '{query[:50]}...'")
        
        async for chunk in self.llm.chat_stream(
            messages=messages,
            temperature=self.temperature,
            max_tokens=2000
        ):
            yield chunk
    
    def _build_messages(
        self,
        query: str,
        evidence_list: List[Evidence],
        context: str = None
    ) -> List[Message]:
        """构建消息列表"""
        messages = [Message(role="system", content=WRITER_SYSTEM_PROMPT)]
        
        # 格式化证据
        evidence_text = self._format_evidence(evidence_list)
        
        # 构建用户消息
        user_content = f"## 用户问题\n{query}\n\n## 可用证据\n{evidence_text}"
        
        if context:
            user_content = f"## 上下文\n{context}\n\n{user_content}"
        
        # 添加引用说明
        if evidence_list:
            citation_refs = self._generate_citation_refs(evidence_list)
            user_content += f"\n\n## 引用参考\n{citation_refs}"
        
        messages.append(Message(role="user", content=user_content))
        
        return messages
    
    def _format_evidence(self, evidence_list: List[Evidence]) -> str:
        """格式化证据"""
        if not evidence_list:
            return "（未找到相关文献证据）"
        
        parts = []
        for i, evidence in enumerate(evidence_list, 1):
            author_str = evidence.authors[0] if evidence.authors else "Unknown"
            if len(evidence.authors) > 1:
                author_str += " et al."
            
            year_str = str(evidence.year) if evidence.year else "n.d."
            section = f" - {evidence.section_title}" if evidence.section_title else ""
            
            parts.append(
                f"**[Evidence {i}]** ({author_str}, {year_str}, p.{evidence.page_number}{section})\n"
                f"「{evidence.content}」\n"
                f"相关度: {evidence.relevance_score:.2f}"
            )
        
        return "\n\n---\n\n".join(parts)
    
    def _generate_citation_refs(self, evidence_list: List[Evidence]) -> str:
        """生成引用参考列表"""
        refs = []
        for i, evidence in enumerate(evidence_list, 1):
            refs.append(evidence.format_citation(i))
        return "\n".join(refs)
