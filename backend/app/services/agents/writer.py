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
WRITER_SYSTEM_PROMPT = """你是一位专业的人文社科学术写作助手。你的任务是基于提供的文献证据，撰写高质量的学术内容。

## 写作原则

1. **严格基于证据**：只使用提供的文献证据，不要虚构或推测
2. **学术规范**：使用正式的学术语言，避免口语化表达
3. **逻辑清晰**：论点明确，论证严密，层次分明
4. **引用标注**：每个观点都要标注来源，使用 [^n] 格式（n 为证据编号）
5. **客观中立**：呈现多元观点，避免主观偏见

## 引用格式

- 当直接引用或转述某个证据时，在相关内容后添加 [^n]
- n 对应证据编号（Evidence 1 用 [^1]，Evidence 2 用 [^2]，以此类推）
- 如果一个论点涉及多个来源，可以使用 [^1][^2] 的形式

## 输出要求

- 直接输出内容，不需要标题
- 确保每个主要论点都有引用支持
- 如果证据不足以回答问题，请明确说明"""


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
