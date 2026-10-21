import json
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from . import ingest as ingest_svc
from .config import settings
from .db import init_db, pool
from .llm import stream_answer
from .retrieval import retrieve


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield
    pool.close()


app = FastAPI(title="DocuMind AI Service", lifespan=lifespan)


def require_internal_key(x_internal_key: str = Header(default="")) -> None:
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid internal key")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ingest", dependencies=[Depends(require_internal_key)])
async def ingest(user_id: str = Form(...), file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.max_upload_mb} MB")
    try:
        return ingest_svc.ingest_document(user_id, file.filename or "upload", data)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@app.get("/documents", dependencies=[Depends(require_internal_key)])
def documents(user_id: str):
    return ingest_svc.list_documents(user_id)


@app.delete("/documents/{doc_id}", dependencies=[Depends(require_internal_key)])
def remove_document(doc_id: str, user_id: str):
    if not ingest_svc.delete_document(user_id, doc_id):
        raise HTTPException(404, "Document not found")
    return {"deleted": True}


class ChatRequest(BaseModel):
    user_id: str
    question: str
    history: list[dict] = []


def sse(event: str, data: str) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.post("/chat", dependencies=[Depends(require_internal_key)])
async def chat(req: ChatRequest):
    hits = retrieve(req.user_id, req.question)

    async def gen():
        sources = [
            {"n": i, "filename": h.filename, "page": h.page, "snippet": h.content[:240]}
            for i, h in enumerate(hits, start=1)
        ]
        yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
        if not hits:
            yield sse("token", "No documents found. Upload a document first.")
        else:
            async for token in stream_answer(req.question, hits, req.history):
                yield sse("token", token)
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")
