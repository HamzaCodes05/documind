from psycopg_pool import ConnectionPool

from .config import settings

pool = ConnectionPool(settings.database_url, min_size=1, max_size=10, open=False)

SCHEMA = f"""
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     text NOT NULL,
    filename    text NOT NULL,
    chunk_count int  NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
    id          bigserial PRIMARY KEY,
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id     text NOT NULL,
    page        int,
    content     text NOT NULL,
    embedding   vector({settings.embedding_dim}) NOT NULL,
    tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX IF NOT EXISTS chunks_user_idx ON chunks (user_id);
CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_user_idx ON documents (user_id);
"""


def init_db() -> None:
    pool.open()
    pool.wait()
    with pool.connection() as conn:
        conn.execute(SCHEMA)
