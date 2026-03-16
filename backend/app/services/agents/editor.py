"""
Editor Agent
负责润色优化文本，去除 AI 痕迹
"""

import logging
from typing import List, AsyncGenerator

from app.services.llm import get_llm_service, Message, LLMResponse

logger = logging.getLogger(__name__)


# 编辑润色系统提示
EDITOR_SYSTEM_PROMPT = """你是一位资深的人文社科学术编辑。你的任务是润色和优化学术文本，使其更符合学术规范，同时去除明显的 AI 写作痕迹。

## 编辑原则

### 去除 AI 痕迹
避免以下常见的 AI 写作特征：
- 过度使用连接词（首先、其次、最后、此外、然而、总之等）
- 机械化的段落结构
- 空洞的概括性语句
- 过于整齐的排比句式
- 「值得注意的是」「需要指出的是」等套话
- 「综上所述」「由此可见」等机械化总结

### 学术风格优化
- 使用更自然、多样的表达方式
- 保持论证的学术严谨性
- 增加语言的层次感和复杂度
- 适当使用学术专业术语
- 让句式长短交错，避免单调

### 保持原意
- 不改变原文的核心观点
- 保留所有引用标注 [^n]
- 不添加新的论点或证据
- 不删除关键信息

## 输出格式
直接输出润色后的文本，不需要解释修改内容。"""


# 简化版编辑提示（用于快速模式）
EDITOR_LITE_PROMPT = """润色以下学术文本，使其更自然流畅。保留所有引用标注 [^n]，直接输出结果："""


class EditorAgent:
    """
    编辑 Agent
    
    职责：
    - 润色优化 Writer 生成的初稿
    - 去除明显的 AI 写作痕迹
    - 提升文本的学术质量
    """
    
    def __init__(self, temperature: float = 0.6):
        """
        初始化编辑 Agent
        
        Args:
            temperature: LLM 温度参数（稍低以保持一致性）
        """
        self.temperature = temperature
        self.llm = get_llm_service()
    
    async def edit(
        self,
        draft: str,
        style_guide: str = None,
        lite_mode: bool = False
    ) -> LLMResponse:
        """
        编辑润色文本
        
        Args:
            draft: 初稿文本
            style_guide: 额外的风格指南
            lite_mode: 是否使用轻量模式（更快但效果略差）
            
        Returns:
            LLM 响应
        """
        messages = self._build_messages(draft, style_guide, lite_mode)
        
        logger.info(f"Editor refining draft ({len(draft)} chars)")
        
        response = await self.llm.chat(
            messages=messages,
            temperature=self.temperature,
            max_tokens=2500
        )
        
        return response
    
    async def edit_stream(
        self,
        draft: str,
        style_guide: str = None,
        lite_mode: bool = False
    ) -> AsyncGenerator[str, None]:
        """
        流式编辑润色
        
        Args:
            draft: 初稿文本
            style_guide: 额外的风格指南
            lite_mode: 是否使用轻量模式
            
        Yields:
            生成的文本片段
        """
        messages = self._build_messages(draft, style_guide, lite_mode)
        
        logger.info(f"Editor streaming refined draft ({len(draft)} chars)")
        
        async for chunk in self.llm.chat_stream(
            messages=messages,
            temperature=self.temperature,
            max_tokens=2500
        ):
            yield chunk
    
    def _build_messages(
        self,
        draft: str,
        style_guide: str = None,
        lite_mode: bool = False
    ) -> List[Message]:
        """构建消息列表"""
        if lite_mode:
            # 轻量模式：单条消息
            content = f"{EDITOR_LITE_PROMPT}\n\n{draft}"
            return [Message(role="user", content=content)]
        
        messages = [Message(role="system", content=EDITOR_SYSTEM_PROMPT)]
        
        # 构建用户消息
        user_content = f"## 待润色的文本\n\n{draft}"
        
        if style_guide:
            user_content = f"## 特殊要求\n{style_guide}\n\n{user_content}"
        
        messages.append(Message(role="user", content=user_content))
        
        return messages
    
    async def quick_polish(self, text: str) -> str:
        """
        快速润色（用于简短文本）
        
        Args:
            text: 输入文本
            
        Returns:
            润色后的文本
        """
        if len(text) < 100:
            # 文本太短，不需要润色
            return text
        
        response = await self.edit(text, lite_mode=True)
        return response.content
    
    async def check_ai_markers(self, text: str) -> List[str]:
        """
        检查文本中的 AI 痕迹（可选功能）
        
        Args:
            text: 待检查文本
            
        Returns:
            发现的 AI 痕迹列表
        """
        # 常见的 AI 写作标记词
        ai_markers = [
            "首先",
            "其次",
            "最后",
            "综上所述",
            "由此可见",
            "值得注意的是",
            "需要指出的是",
            "总而言之",
            "不难发现",
            "显而易见",
            "众所周知",
        ]
        
        found_markers = []
        for marker in ai_markers:
            if marker in text:
                # 计算出现次数
                count = text.count(marker)
                if count >= 2:  # 重复出现才报告
                    found_markers.append(f"'{marker}' 出现 {count} 次")
        
        return found_markers
