"""
对话路由
"""

import json
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.document import Document
from app.models.conversation import Conversation, Message, MessageRole
from app.schemas.chat import ChatRequest, ConversationResponse, MessageResponse, ConversationListResponse
from app.schemas.common import ApiResponse
from app.services.agents import create_orchestrator, AgentState

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)


async def generate_sse_response(
    request: ChatRequest,
    db: AsyncSession
) -> AsyncGenerator[str, None]:
    """
    生成 SSE 流式响应
    
    使用 Agent 编排器处理请求：
    1. Researcher Agent 检索相关文献片段
    2. Writer Agent 基于证据撰写回答
    3. Editor Agent 润色优化（可选）
    """
    # 获取或创建对话
    if request.conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == request.conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            yield f"event: error\ndata: {json.dumps({'code': 'CONVERSATION_NOT_FOUND', 'message': '对话不存在'})}\n\n"
            return
    else:
        # 创建新对话，关联项目
        conversation = Conversation(
            project_id=request.project_id,
            title=request.message[:50] + "..." if len(request.message) > 50 else request.message
        )
        db.add(conversation)
        await db.flush()
    
    # 保存用户消息
    user_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=request.message
    )
    db.add(user_message)
    await db.flush()
    
    # 创建助手消息
    assistant_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=""
    )
    db.add(assistant_message)
    await db.flush()
    
    # 发送开始事件
    yield f"event: start\ndata: {json.dumps({'conversation_id': conversation.id, 'message_id': assistant_message.id})}\n\n"
    
    try:
        # 创建 Agent 编排器
        orchestrator = create_orchestrator(skip_editor=False)
        
        # 用于收集完整内容
        full_content = ""
        citations = []
        
        # 状态到 Agent 名称的映射
        state_to_agent = {
            AgentState.RESEARCHING: "researcher",
            AgentState.WRITING: "writer",
            AgentState.EDITING: "editor"
        }
        
        # 流式执行 Agent
        async for event in orchestrator.run_stream(
            query=request.message,
            document_ids=request.document_ids
        ):
            event_type = event.get("type")
            
            if event_type == "state":
                # 发送 Agent 状态更新
                state = event.get("state")
                agent_name = state_to_agent.get(state, "unknown")
                status_str = "working" if state != AgentState.COMPLETED else "done"
                
                yield f"event: agent\ndata: {json.dumps({'agent': agent_name, 'status': status_str, 'detail': event.get('message', '')})}\n\n"
            
            elif event_type == "evidence":
                # 发送证据信息
                evidence_list = event.get("evidence", [])
                yield f"event: evidence\ndata: {json.dumps({'count': len(evidence_list), 'evidence': evidence_list})}\n\n"
            
            elif event_type == "content":
                # 发送内容片段
                chunk = event.get("content", "")
                full_content += chunk
                yield f"event: content\ndata: {json.dumps({'text': chunk})}\n\n"
            
            elif event_type == "clear":
                # 清空内容（编辑 Agent 重写时）
                full_content = ""
                yield f"event: clear\ndata: {json.dumps({})}\n\n"
            
            elif event_type == "done":
                # 获取引用信息
                citations = event.get("citations", [])
                
                # 发送引用事件
                for citation in citations:
                    yield f"event: citation\ndata: {json.dumps(citation)}\n\n"
                
                # 发送完成事件
                yield f"event: agent\ndata: {json.dumps({'agent': 'editor', 'status': 'done'})}\n\n"
                yield f"event: done\ndata: {json.dumps({'total_tokens': len(full_content), 'citations': citations})}\n\n"
            
            elif event_type == "error":
                # 发送错误事件
                yield f"event: error\ndata: {json.dumps({'code': 'AGENT_ERROR', 'message': event.get('error', 'Unknown error')})}\n\n"
        
        # 更新消息内容和引用
        assistant_message.content = full_content
        assistant_message.citations = citations
        
        await db.commit()
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        yield f"event: error\ndata: {json.dumps({'code': 'INTERNAL_ERROR', 'message': str(e)})}\n\n"
        await db.rollback()


@router.post(
    "",
    summary="发送对话消息",
    description="发送消息并获取 AI 回复（SSE 流式响应）"
)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    发送对话消息
    
    使用 Server-Sent Events (SSE) 流式返回响应
    """
    # 验证文献存在
    for doc_id in request.document_ids:
        result = await db.execute(
            select(Document).where(Document.id == doc_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"文献 {doc_id} 不存在"
            )
    
    return StreamingResponse(
        generate_sse_response(request, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get(
    "/{conversation_id}/history",
    response_model=ApiResponse[ConversationResponse],
    summary="获取对话历史"
)
async def get_conversation_history(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取指定对话的历史消息"""
    
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在"
        )
    
    # 获取消息
    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = messages_result.scalars().all()
    
    return ApiResponse(
        data=ConversationResponse(
            id=conversation.id,
            project_id=conversation.project_id,
            title=conversation.title,
            messages=[MessageResponse(
                id=msg.id,
                role=msg.role.value,
                content=msg.content,
                citations=msg.citations,
                created_at=msg.created_at
            ) for msg in messages],
            created_at=conversation.created_at,
            updated_at=conversation.updated_at
        )
    )


@router.get(
    "/project/{project_id}",
    response_model=ApiResponse,
    summary="获取项目的对话列表"
)
async def get_project_conversations(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取指定项目的所有对话"""
    from sqlalchemy import func
    
    # 获取项目的所有对话
    result = await db.execute(
        select(Conversation)
        .where(Conversation.project_id == project_id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    
    conversation_list = []
    for conv in conversations:
        # 获取最后一条消息预览
        last_msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        
        # 获取消息数量
        count_result = await db.execute(
            select(func.count(Message.id))
            .where(Message.conversation_id == conv.id)
        )
        message_count = count_result.scalar() or 0
        
        conversation_list.append(ConversationListResponse(
            id=conv.id,
            project_id=conv.project_id,
            title=conv.title,
            message_count=message_count,
            last_message_preview=last_msg.content[:100] if last_msg else None,
            created_at=conv.created_at,
            updated_at=conv.updated_at
        ).model_dump())
    
    return ApiResponse(
        success=True,
        data=conversation_list
    )


@router.get(
    "/project/{project_id}/latest",
    response_model=ApiResponse,
    summary="获取项目最新对话"
)
async def get_project_latest_conversation(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取项目最近一次对话及其完整历史"""
    
    # 获取最新对话
    result = await db.execute(
        select(Conversation)
        .where(Conversation.project_id == project_id)
        .order_by(Conversation.updated_at.desc())
        .limit(1)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        return ApiResponse(
            success=True,
            data=None,
            message="该项目暂无对话历史"
        )
    
    # 获取消息
    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    messages = messages_result.scalars().all()
    
    return ApiResponse(
        success=True,
        data=ConversationResponse(
            id=conversation.id,
            project_id=conversation.project_id,
            title=conversation.title,
            messages=[MessageResponse(
                id=msg.id,
                role=msg.role.value,
                content=msg.content,
                citations=msg.citations,
                created_at=msg.created_at
            ) for msg in messages],
            created_at=conversation.created_at,
            updated_at=conversation.updated_at
        ).model_dump()
    )


@router.delete(
    "/{conversation_id}",
    response_model=ApiResponse,
    summary="删除对话"
)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除指定对话及其所有消息"""
    
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在"
        )
    
    await db.delete(conversation)
    await db.commit()
    
    return ApiResponse(
        success=True,
        message="对话已删除"
    )

