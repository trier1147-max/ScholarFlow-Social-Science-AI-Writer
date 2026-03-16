"""
Agent 编排器
协调 Researcher、Writer、Editor 三个 Agent 的执行流程
"""

import logging
from typing import List, Dict, Any, AsyncGenerator, Callable, Awaitable
from dataclasses import dataclass
from enum import Enum

from app.services.agents.researcher import ResearcherAgent, Evidence
from app.services.agents.writer import WriterAgent
from app.services.agents.editor import EditorAgent

logger = logging.getLogger(__name__)


class AgentState(str, Enum):
    """Agent 执行状态"""
    IDLE = "idle"
    RESEARCHING = "researching"
    WRITING = "writing"
    EDITING = "editing"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class AgentEvent:
    """Agent 事件"""
    state: AgentState
    message: str
    data: Dict[str, Any] = None


@dataclass
class OrchestratorResult:
    """编排器执行结果"""
    content: str
    evidence: List[Evidence]
    citations: List[Dict[str, Any]]
    states: List[AgentState]


class AgentOrchestrator:
    """
    Agent 编排器
    
    负责协调三个 Agent 的串行执行：
    1. Researcher: 检索相关证据
    2. Writer: 基于证据撰写初稿
    3. Editor: 润色优化，去除 AI 痕迹
    """
    
    def __init__(
        self,
        researcher: ResearcherAgent = None,
        writer: WriterAgent = None,
        editor: EditorAgent = None,
        skip_editor: bool = False
    ):
        """
        初始化编排器
        
        Args:
            researcher: 研究员 Agent
            writer: 写手 Agent
            editor: 编辑 Agent
            skip_editor: 是否跳过编辑步骤（加速响应）
        """
        self.researcher = researcher or ResearcherAgent()
        self.writer = writer or WriterAgent()
        self.editor = editor or EditorAgent()
        self.skip_editor = skip_editor
    
    async def run(
        self,
        query: str,
        document_ids: List[str],
        context: str = None,
        on_event: Callable[[AgentEvent], Awaitable[None]] = None
    ) -> OrchestratorResult:
        """
        执行完整的 Agent 流程（非流式）
        
        Args:
            query: 用户问题
            document_ids: 选中的文献ID列表
            context: 额外上下文
            on_event: 事件回调函数
            
        Returns:
            执行结果
        """
        states = []
        
        async def emit(state: AgentState, message: str, data: Dict = None):
            event = AgentEvent(state=state, message=message, data=data)
            states.append(state)
            if on_event:
                await on_event(event)
        
        try:
            # Step 1: 研究 - 检索证据
            await emit(AgentState.RESEARCHING, "正在检索相关文献...")
            
            evidence_list = await self.researcher.search(
                query=query,
                document_ids=document_ids
            )
            
            await emit(
                AgentState.RESEARCHING,
                f"找到 {len(evidence_list)} 条相关证据",
                data={"evidence_count": len(evidence_list)}
            )
            
            # Step 2: 写作 - 撰写初稿
            await emit(AgentState.WRITING, "正在撰写初稿...")
            
            writer_response = await self.writer.write(
                query=query,
                evidence_list=evidence_list,
                context=context
            )
            
            draft = writer_response.content
            
            # Step 3: 编辑 - 润色优化（可选）
            if self.skip_editor or len(draft) < 200:
                final_content = draft
                await emit(AgentState.COMPLETED, "写作完成")
            else:
                await emit(AgentState.EDITING, "正在润色优化...")
                
                editor_response = await self.editor.edit(draft)
                final_content = editor_response.content
                
                await emit(AgentState.COMPLETED, "润色完成")
            
            # 生成引用信息
            citations = self._generate_citations(evidence_list)
            
            return OrchestratorResult(
                content=final_content,
                evidence=evidence_list,
                citations=citations,
                states=states
            )
            
        except Exception as e:
            logger.error(f"Orchestrator error: {e}")
            await emit(AgentState.ERROR, f"处理出错: {str(e)}")
            raise
    
    async def run_stream(
        self,
        query: str,
        document_ids: List[str],
        context: str = None,
        on_event: Callable[[AgentEvent], Awaitable[None]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        执行 Agent 流程（流式输出）
        
        Args:
            query: 用户问题
            document_ids: 选中的文献ID列表
            context: 额外上下文
            on_event: 事件回调函数
            
        Yields:
            流式事件，包括状态更新和内容片段
        """
        async def emit(state: AgentState, message: str, data: Dict = None):
            event = AgentEvent(state=state, message=message, data=data)
            if on_event:
                await on_event(event)
            return event
        
        try:
            # Step 1: 研究 - 检索证据
            event = await emit(AgentState.RESEARCHING, "正在检索相关文献...")
            yield {"type": "state", "state": event.state, "message": event.message}
            
            evidence_list = await self.researcher.search(
                query=query,
                document_ids=document_ids
            )
            
            event = await emit(
                AgentState.RESEARCHING,
                f"找到 {len(evidence_list)} 条相关证据",
                data={"evidence_count": len(evidence_list)}
            )
            yield {
                "type": "evidence",
                "evidence": [e.to_dict() for e in evidence_list]
            }
            
            # Step 2: 写作 - 流式撰写
            event = await emit(AgentState.WRITING, "正在撰写...")
            yield {"type": "state", "state": event.state, "message": event.message}
            
            draft_chunks = []
            async for chunk in self.writer.write_stream(
                query=query,
                evidence_list=evidence_list,
                context=context
            ):
                draft_chunks.append(chunk)
                yield {"type": "content", "content": chunk}
            
            draft = "".join(draft_chunks)
            
            # Step 3: 编辑 - 润色优化（可选）
            if not self.skip_editor and len(draft) >= 200:
                event = await emit(AgentState.EDITING, "正在润色优化...")
                yield {"type": "state", "state": event.state, "message": event.message}
                
                # 清空内容，准备输出润色版本
                yield {"type": "clear"}
                
                async for chunk in self.editor.edit_stream(draft):
                    yield {"type": "content", "content": chunk}
            
            # 完成
            event = await emit(AgentState.COMPLETED, "完成")
            citations = self._generate_citations(evidence_list)
            yield {
                "type": "done",
                "state": event.state,
                "citations": citations
            }
            
        except Exception as e:
            logger.error(f"Orchestrator stream error: {e}")
            event = await emit(AgentState.ERROR, f"处理出错: {str(e)}")
            yield {"type": "error", "error": str(e)}
            raise
    
    def _generate_citations(self, evidence_list: List[Evidence]) -> List[Dict[str, Any]]:
        """生成引用信息列表"""
        citations = []
        
        for i, evidence in enumerate(evidence_list, 1):
            author_str = evidence.authors[0] if evidence.authors else "Unknown"
            if len(evidence.authors) > 1:
                author_str += " et al."
            
            citations.append({
                "index": i,
                "marker": f"[^{i}]",
                "chunk_id": evidence.chunk_id,  # 添加 chunk_id 用于引用回溯
                "document_id": evidence.document_id,
                "document_title": evidence.document_title,
                "authors": evidence.authors,
                "author_display": author_str,
                "year": evidence.year,
                "page": evidence.page_number,
                "section": evidence.section_title,
                "excerpt": evidence.content[:200] + "..." if len(evidence.content) > 200 else evidence.content
            })
        
        return citations


def create_orchestrator(skip_editor: bool = False) -> AgentOrchestrator:
    """
    创建 Agent 编排器
    
    Args:
        skip_editor: 是否跳过编辑步骤
        
    Returns:
        AgentOrchestrator 实例
    """
    return AgentOrchestrator(skip_editor=skip_editor)
