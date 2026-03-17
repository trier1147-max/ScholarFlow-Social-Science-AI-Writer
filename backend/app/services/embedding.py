"""
Embedding 服务
使用 Jina Embeddings v3 API（无需本地模型，内存占用极低）
"""

import logging
import requests
from typing import List, Optional

from app.config import settings

logger = logging.getLogger(__name__)

JINA_API_URL = "https://api.jina.ai/v1/embeddings"
JINA_MODEL = "jina-embeddings-v3"


def _call_jina(texts: List[str], task: str) -> List[List[float]]:
    """调用 Jina Embeddings API"""
    print(f"[JINA] Calling API: {len(texts)} texts, task={task}, key_set={bool(settings.JINA_API_KEY)}", flush=True)
    headers = {
        "Authorization": f"Bearer {settings.JINA_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": JINA_MODEL,
        "input": texts,
        "task": task,
    }
    response = requests.post(JINA_API_URL, headers=headers, json=payload, timeout=60)
    print(f"[JINA] Response status: {response.status_code}", flush=True)
    response.raise_for_status()
    data = response.json()
    return [item["embedding"] for item in data["data"]]


class EmbeddingService:
    """文本向量化服务（Jina API）"""

    def embed_text(self, text: str) -> List[float]:
        return _call_jina([text], task="retrieval.passage")[0]

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        results = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            results.extend(_call_jina(batch, task="retrieval.passage"))
        return results

    def embed_query(self, query: str) -> List[float]:
        return _call_jina([query], task="retrieval.query")[0]


# 单例
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service(**kwargs) -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
