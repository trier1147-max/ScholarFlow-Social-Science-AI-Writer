"""
写作润色路由
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import json

from app.services.agents.editor import EditorAgent
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/api/polish", tags=["polish"])
logger = logging.getLogger(__name__)


class PolishRequest(BaseModel):
    """润色请求"""
    content: str = Field(..., min_length=10, max_length=50000)
    style_guide: Optional[str] = Field(default=None, max_length=1000)
    lite_mode: bool = Field(default=False, description="是否使用轻量模式")


class PolishResponse(BaseModel):
    """润色响应"""
    content: str
    original_length: int
    polished_length: int
    ai_markers: List[str] = []


class CheckMarkersRequest(BaseModel):
    """检查 AI 痕迹请求"""
    content: str = Field(..., min_length=10, max_length=50000)


class CheckMarkersResponse(BaseModel):
    """检查 AI 痕迹响应"""
    markers: List[str]
    has_issues: bool


@router.post(
    "",
    response_model=ApiResponse[PolishResponse],
    summary="润色文本"
)
async def polish_text(request: PolishRequest):
    """
    使用 AI 润色文本
    
    - 去除明显的 AI 写作痕迹
    - 提升学术风格
    - 保留引用标注
    
    Args:
        content: 待润色的文本
        style_guide: 额外的风格指导（可选）
        lite_mode: 轻量模式，速度更快但效果略差
    """
    try:
        editor = EditorAgent()
        
        logger.info(f"Polishing text ({len(request.content)} chars)")
        
        response = await editor.edit(
            draft=request.content,
            style_guide=request.style_guide,
            lite_mode=request.lite_mode
        )
        
        polished_content = response.content
        
        # 检查润色后的文本中的 AI 痕迹
        ai_markers = await editor.check_ai_markers(polished_content)
        
        return ApiResponse(
            data=PolishResponse(
                content=polished_content,
                original_length=len(request.content),
                polished_length=len(polished_content),
                ai_markers=ai_markers
            ),
            message="润色完成"
        )
        
    except Exception as e:
        logger.error(f"Polish error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"润色失败: {str(e)}"
        )


@router.post(
    "/stream",
    summary="流式润色文本"
)
async def polish_text_stream(request: PolishRequest):
    """
    流式润色文本（实时返回结果）
    
    返回 Server-Sent Events (SSE) 格式的流式数据
    """
    async def generate():
        try:
            editor = EditorAgent()
            
            logger.info(f"Streaming polish for text ({len(request.content)} chars)")
            
            async for chunk in editor.edit_stream(
                draft=request.content,
                style_guide=request.style_guide,
                lite_mode=request.lite_mode
            ):
                yield f"data: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
            
            yield f"data: {json.dumps({'done': True}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            logger.error(f"Stream polish error: {e}")
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post(
    "/check-markers",
    response_model=ApiResponse[CheckMarkersResponse],
    summary="检查 AI 写作痕迹"
)
async def check_ai_markers(request: CheckMarkersRequest):
    """
    检查文本中的 AI 写作痕迹
    
    返回发现的问题列表，帮助用户自行修改
    """
    try:
        editor = EditorAgent()
        
        markers = await editor.check_ai_markers(request.content)
        
        return ApiResponse(
            data=CheckMarkersResponse(
                markers=markers,
                has_issues=len(markers) > 0
            )
        )
        
    except Exception as e:
        logger.error(f"Check markers error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"检查失败: {str(e)}"
        )


@router.post(
    "/quick",
    response_model=ApiResponse[PolishResponse],
    summary="快速润色"
)
async def quick_polish(request: PolishRequest):
    """
    快速润色（轻量版）
    
    速度更快，适合简短文本或实时润色
    """
    try:
        editor = EditorAgent()
        
        logger.info(f"Quick polishing text ({len(request.content)} chars)")
        
        polished_content = await editor.quick_polish(request.content)
        
        return ApiResponse(
            data=PolishResponse(
                content=polished_content,
                original_length=len(request.content),
                polished_length=len(polished_content),
                ai_markers=[]
            ),
            message="快速润色完成"
        )
        
    except Exception as e:
        logger.error(f"Quick polish error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"润色失败: {str(e)}"
        )
