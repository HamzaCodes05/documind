# DocuMind: chat with your documents

A multi-tenant **RAG knowledge base**. Users sign up, upload PDFs/Markdown/text, and ask
questions. Answers stream in real time and cite the exact source passages.

![stack](https://img.shields.io/badge/Next.js-14-black) ![stack](https://img.shields.io/badge/NestJS-10-red) ![stack](https://img.shields.io/badge/FastAPI-Python_3.12-009688) ![stack](https://img.shields.io/badge/Postgres-pgvector-336791) ![ci](https://img.shields.io/badge/CI-GitHub_Actions-2088FF)

## Architecture

```
┌──────────┐  JWT   ┌─────────────┐ x-internal-key ┌────────────────┐
│ Next.js  │───────▶│   NestJS    │───────────────▶│    FastAPI     │
│ (web)    │◀──SSE──│ (auth, API  │◀──────SSE──────│ (ingest, RAG,  │
└──────────┘        │  gateway)   │                │  LLM stream)   │
                    └──────┬──────┘                └───────┬────────┘
                           │ users                         │ documents, chunks
                           └──────────────▶ Postgres + pgvector ◀──┘
```

| Service | Responsibility |
|---|---|
| `web/` | Next.js 14 (App Router) + Tailwind. Auth, upload, streaming chat UI with citations |
| `api/` | NestJS. Registration/login (bcrypt + JWT), request validation, file upload, SSE proxy |
| `ai-service/` | FastAPI. Parsing, chunking, local embeddings, hybrid retrieval, Claude streaming |
| `db` | Postgres 16 with pgvector (HNSW index) and full-text search (GIN index) |

## Key design decisions

- **Hybrid retrieval.** Dense vector search (pgvector cosine) and Postgres full-text search run
  in parallel. Results are merged with **Reciprocal Rank Fusion**, which improves recall on
  exact terms (names, IDs, acronyms) that embeddings miss.
- **Local embeddings.** `BAAI/bge-small-en-v1.5` via FastEmbed (ONNX, CPU). No embedding API
  cost and no document text leaves the server for indexing.
- **Tenant isolation.** Every chunk row carries `user_id`, and every query filters on it. The
  AI service is only reachable with a shared internal key, so users never reach it directly.
- **Grounded answers.** The prompt restricts the model to retrieved excerpts, forces inline
  `[n]` citations, and tells it to say so when the answer isn't in the documents.
- **Streaming end to end.** Claude tokens flow FastAPI → NestJS → browser as SSE. The first
  event carries the sources so the UI can render citations immediately.
- **Overlapping chunks.** Paragraph-aware word windows with overlap keep context across boundaries.

## Run it

```bash
cp .env.example .env        # add ANTHROPIC_API_KEY, change the secrets
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:4000
- AI service docs: http://localhost:8000/docs

First start downloads nothing at runtime: the embedding model is baked into the image.

### Local development

```bash
# DB
docker compose up db -d

# AI service
cd ai-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pytest
uvicorn app.main:app --reload --port 8000
pytest

# API
cd api && npm install && npm run start:dev

# Web
cd web && npm install && npm run dev
```

## API

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Returns `{ accessToken }` |
| GET | `/documents` | List the caller's documents |
| POST | `/documents/upload` | Multipart `file` (.pdf, .txt, .md, max 20 MB) |
| DELETE | `/documents/:id` | Delete a document and its chunks |
| POST | `/chat` | `{ question, history? }` returns an SSE stream (`sources`, `token`, `done`) |

## Production notes / roadmap

- [ ] Replace TypeORM `synchronize` with migrations
- [ ] Move ingestion to a background queue (BullMQ/SQS) for large files
- [ ] Add a cross-encoder reranker after RRF
- [ ] Rate limiting and per-user storage quotas
- [ ] Evaluation harness (retrieval hit-rate / answer faithfulness on a labelled set)
- [ ] OCR for scanned PDFs

## License

MIT
