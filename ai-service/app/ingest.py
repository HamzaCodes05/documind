import io

from pypdf import PdfReader

from .chunking import chunk_text
from .config import settings
from .db import pool
from .embeddings import embed_documents, to_pgvector

ALLOWED = {".pdf", ".txt", ".md"}


def extract_pages(filename: str, data: bytes) -> list[tuple[int, str]]:
    name = filename.lower()
    if name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        return [(i + 1, page.extract_text() or "") for i, page in enumerate(reader.pages)]
    if name.endswith((".txt", ".md")):
        return [(1, data.decode("utf-8", errors="ignore"))]
    raise ValueError(f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED))}")


def ingest_document(user_id: str, filename: str, data: bytes) -> dict:
    pages = extract_pages(filename, data)

    records: list[tuple[int, str]] = []
    for page_no, text in pages:
        for chunk in chunk_text(text, settings.chunk_size, settings.chunk_overlap):
            records.append((page_no, chunk))

    if not records:
        raise ValueError("No extractable text found in the document")

    vectors = embed_documents([c for _, c in records])

    with pool.connection() as conn:
        with conn.transaction():
            doc_id = conn.execute(
                "INSERT INTO documents (user_id, filename, chunk_count) "
                "VALUES (%s, %s, %s) RETURNING id",
                (user_id, filename, len(records)),
            ).fetchone()[0]
            with conn.cursor() as cur:
                cur.executemany(
                    "INSERT INTO chunks (document_id, user_id, page, content, embedding) "
                    "VALUES (%s, %s, %s, %s, %s::vector)",
                    [
                        (doc_id, user_id, page, content, to_pgvector(vec))
                        for (page, content), vec in zip(records, vectors)
                    ],
                )
    return {"id": str(doc_id), "filename": filename, "chunks": len(records)}


def list_documents(user_id: str) -> list[dict]:
    with pool.connection() as conn:
        rows = conn.execute(
            "SELECT id, filename, chunk_count, created_at FROM documents "
            "WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [
        {"id": str(r[0]), "filename": r[1], "chunks": r[2], "created_at": r[3].isoformat()}
        for r in rows
    ]


def delete_document(user_id: str, doc_id: str) -> bool:
    with pool.connection() as conn:
        cur = conn.execute(
            "DELETE FROM documents WHERE id = %s AND user_id = %s", (doc_id, user_id)
        )
        return cur.rowcount > 0
