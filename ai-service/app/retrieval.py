"""Hybrid retrieval: pgvector cosine search + Postgres full-text search,
merged with Reciprocal Rank Fusion (RRF)."""
from dataclasses import dataclass

from .config import settings
from .db import pool
from .embeddings import embed_query, to_pgvector
from .fusion import rrf_merge

CANDIDATES = 20


@dataclass
class Hit:
    chunk_id: int
    filename: str
    page: int | None
    content: str
    score: float = 0.0


def retrieve(user_id: str, question: str, top_k: int | None = None) -> list[Hit]:
    top_k = top_k or settings.top_k
    qvec = to_pgvector(embed_query(question))

    with pool.connection() as conn:
        vec_rows = conn.execute(
            """
            SELECT c.id, d.filename, c.page, c.content
            FROM chunks c JOIN documents d ON d.id = c.document_id
            WHERE c.user_id = %s
            ORDER BY c.embedding <=> %s::vector
            LIMIT %s
            """,
            (user_id, qvec, CANDIDATES),
        ).fetchall()

        fts_rows = conn.execute(
            """
            SELECT c.id, d.filename, c.page, c.content
            FROM chunks c JOIN documents d ON d.id = c.document_id,
                 plainto_tsquery('english', %s) q
            WHERE c.user_id = %s AND c.tsv @@ q
            ORDER BY ts_rank(c.tsv, q) DESC
            LIMIT %s
            """,
            (question, user_id, CANDIDATES),
        ).fetchall()

    by_id: dict[int, Hit] = {}
    for row in [*vec_rows, *fts_rows]:
        by_id.setdefault(row[0], Hit(row[0], row[1], row[2], row[3]))

    scores = rrf_merge([[r[0] for r in vec_rows], [r[0] for r in fts_rows]])
    for cid, score in scores.items():
        by_id[cid].score = score

    return sorted(by_id.values(), key=lambda h: h.score, reverse=True)[:top_k]
