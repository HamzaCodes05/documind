from functools import lru_cache

from fastembed import TextEmbedding

from .config import settings


@lru_cache(maxsize=1)
def _model() -> TextEmbedding:
    return TextEmbedding(settings.embedding_model)


def embed_documents(texts: list[str]) -> list[list[float]]:
    return [v.tolist() for v in _model().embed(texts)]


def embed_query(text: str) -> list[float]:
    # bge models work best with this instruction prefix on queries
    q = "Represent this sentence for searching relevant passages: " + text
    return next(iter(_model().embed([q]))).tolist()


def to_pgvector(vec: list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"
