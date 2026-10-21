from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic

from .config import settings
from .retrieval import Hit

SYSTEM_PROMPT = """You are DocuMind, an assistant that answers questions using ONLY the \
provided context excerpts from the user's documents.

Rules:
- Cite sources inline as [1], [2] matching the excerpt numbers.
- If the context does not contain the answer, say you could not find it in the documents.
- Be concise and accurate. Never invent facts."""


def build_context(hits: list[Hit]) -> str:
    parts = []
    for i, h in enumerate(hits, start=1):
        loc = f", page {h.page}" if h.page else ""
        parts.append(f"[{i}] ({h.filename}{loc})\n{h.content}")
    return "\n\n".join(parts)


async def stream_answer(
    question: str, hits: list[Hit], history: list[dict]
) -> AsyncIterator[str]:
    if not settings.anthropic_api_key:
        yield "ANTHROPIC_API_KEY is not configured on the AI service."
        return

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    user_content = f"Context:\n{build_context(hits)}\n\nQuestion: {question}"
    messages = [*history[-6:], {"role": "user", "content": user_content}]

    async with client.messages.stream(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text
