"""
LLM 服务
封装 DeepSeek API 调用
"""

import logging
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class Message:
    """消息"""
    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class LLMResponse:
    """LLM 响应"""
    content: str
    finish_reason: str
    usage: Dict[str, int]


class LLMService:
    """LLM 服务"""
    
    def __init__(
        self,
        api_key: str = None,
        base_url: str = None,
        model: str = None
    ):
        """
        初始化 LLM 服务
        
        Args:
            api_key: API Key
            base_url: API 基础 URL
            model: 模型名称
        """
        self.api_key = api_key or settings.DEEPSEEK_API_KEY
        self.base_url = base_url or settings.DEEPSEEK_BASE_URL
        self.model = model or settings.DEEPSEEK_MODEL
        
        if not self.api_key:
            logger.warning("DeepSeek API key not configured")
        
        self._client = None
    
    def _get_client(self) -> AsyncOpenAI:
        """获取 OpenAI 客户端（DeepSeek 兼容 OpenAI API）"""
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url
            )
        return self._client
    
    async def chat(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> LLMResponse:
        """
        发送对话请求
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大生成 token 数
            
        Returns:
            LLM 响应
        """
        if not self.api_key:
            # 如果没有配置 API Key，返回模拟响应
            return self._mock_response(messages)
        
        client = self._get_client()
        
        # 转换消息格式
        api_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        try:
            response = await client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            return LLMResponse(
                content=response.choices[0].message.content,
                finish_reason=response.choices[0].finish_reason,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            )
            
        except Exception as e:
            logger.error(f"LLM request failed: {e}")
            raise
    
    async def chat_stream(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        发送流式对话请求
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大生成 token 数
            
        Yields:
            生成的文本片段
        """
        if not self.api_key:
            # 如果没有配置 API Key，返回模拟流式响应
            async for chunk in self._mock_stream_response(messages):
                yield chunk
            return
        
        client = self._get_client()
        
        # 转换消息格式
        api_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        try:
            stream = await client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **kwargs
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"LLM stream request failed: {e}")
            raise
    
    def _mock_response(self, messages: List[Message]) -> LLMResponse:
        """模拟响应（API Key 未配置时使用）"""
        last_message = messages[-1].content if messages else ""
        
        mock_content = f"""[Mock Response - DeepSeek API not configured]

Based on your question: "{last_message[:100]}..."

This is a simulated response. To enable real AI responses:
1. Get your DeepSeek API key from https://platform.deepseek.com
2. Add it to backend/.env: DEEPSEEK_API_KEY=your_key_here
3. Restart the backend server

The system will then use the DeepSeek API for intelligent responses."""
        
        return LLMResponse(
            content=mock_content,
            finish_reason="stop",
            usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        )
    
    async def _mock_stream_response(
        self,
        messages: List[Message]
    ) -> AsyncGenerator[str, None]:
        """模拟流式响应"""
        import asyncio
        
        response = self._mock_response(messages)
        
        # 模拟流式输出
        for char in response.content:
            yield char
            await asyncio.sleep(0.01)


# 单例
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """获取 LLM 服务单例"""
    global _llm_service
    
    if _llm_service is None:
        _llm_service = LLMService()
    
    return _llm_service
