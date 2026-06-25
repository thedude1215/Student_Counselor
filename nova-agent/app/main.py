import json
import time
import traceback
from datetime import datetime
from collections import defaultdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.models import ChatRequest, ChatResponse, EssayReviewRequest, EssayReviewResponse
from app.graphs.chat_graph import run_chat, stream_chat
from app.llm import llm
from app.tools.student_tools import set_current_user
from app.prompts.system_prompts import ESSAY_REVIEW_PROMPT
from app.supabase_client import supabase
from langchain_core.messages import SystemMessage, HumanMessage

app = FastAPI(title="Nova Agent", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8787", "http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# In-memory rate limiting
_rate_limits: dict[str, list[float]] = defaultdict(list)


def _check_rate(user_id: str, bucket: str, max_per_hour: int) -> bool:
    key = f"{user_id}:{bucket}"
    now = time.time()
    window = [t for t in _rate_limits[key] if now - t < 3600]
    if len(window) >= max_per_hour:
        return False
    window.append(now)
    _rate_limits[key] = window
    return True


def _load_history(conversation_id: str, user_id: str, limit: int = 20) -> list[dict]:
    result = (
        supabase.table("chat_messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .eq("profile_id", user_id)
        .order("created_at")
        .limit(limit)
        .execute()
    )
    return result.data or []


def _save_messages(user_id: str, conversation_id: str, user_msg: str, nova_reply: str):
    now = datetime.utcnow().isoformat()
    supabase.table("chat_messages").insert([
        {
            "profile_id": user_id,
            "conversation_id": conversation_id,
            "role": "user",
            "content": user_msg,
            "created_at": now,
        },
        {
            "profile_id": user_id,
            "conversation_id": conversation_id,
            "role": "nova",
            "content": nova_reply,
            "created_at": now,
        },
    ]).execute()


@app.get("/api/health")
def health():
    return {"ok": True, "service": "nova-agent"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.messages and not req.conversation_id:
        raise HTTPException(status_code=400, detail="messages or conversation_id required")

    if not _check_rate(req.user_id, "chat", 30):
        raise HTTPException(status_code=429, detail="Rate limit reached (30 messages/hour).")

    history = []
    if req.conversation_id:
        history = _load_history(req.conversation_id, req.user_id)

    incoming = [{"role": m.role, "content": m.content} for m in req.messages]
    all_messages = history + incoming

    try:
        reply, tools_used = run_chat(req.user_id, all_messages)
    except Exception as exc:
        print(f"[Nova] /api/chat error for user={req.user_id}")
        print(f"[Nova] {type(exc).__name__}: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")

    if req.conversation_id and incoming:
        user_msg = incoming[-1]["content"]
        _save_messages(req.user_id, req.conversation_id, user_msg, reply)

    return ChatResponse(reply=reply, tool_calls_made=tools_used)


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    if not req.messages and not req.conversation_id:
        raise HTTPException(status_code=400, detail="messages or conversation_id required")

    if not _check_rate(req.user_id, "chat", 30):
        raise HTTPException(status_code=429, detail="Rate limit reached (30 messages/hour).")

    history = []
    if req.conversation_id:
        history = _load_history(req.conversation_id, req.user_id)

    incoming = [{"role": m.role, "content": m.content} for m in req.messages]
    all_messages = history + incoming

    def event_generator():
        full_reply = ""
        try:
            for event in stream_chat(req.user_id, all_messages):
                if event["type"] == "tool_call":
                    yield f"event: tool_call\ndata: {json.dumps({'name': event['name']})}\n\n"
                elif event["type"] == "text":
                    full_reply = event["content"]
                    yield f"event: text\ndata: {json.dumps({'content': event['content']})}\n\n"
                elif event["type"] == "done":
                    yield f"event: done\ndata: {json.dumps({'tool_calls_made': event['tool_calls_made']})}\n\n"
        except Exception as exc:
            print(f"[Nova] stream_chat error for user={req.user_id}")
            print(f"[Nova] {type(exc).__name__}: {exc}")
            traceback.print_exc()
            yield f"event: error\ndata: {json.dumps({'error': f'{type(exc).__name__}: {exc}'})}\n\n"
            return

        if req.conversation_id and incoming and full_reply:
            user_msg = incoming[-1]["content"]
            _save_messages(req.user_id, req.conversation_id, user_msg, full_reply)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/essay-review", response_model=EssayReviewResponse)
def essay_review(req: EssayReviewRequest):
    if not _check_rate(req.user_id, "essay", 5):
        raise HTTPException(status_code=429, detail="Rate limit reached (5 reviews/day).")

    set_current_user(req.user_id)

    context_parts = []
    if req.essay_title:
        context_parts.append(f"Essay Title: {req.essay_title}")
    if req.essay_prompt:
        context_parts.append(f"Prompt: {req.essay_prompt}")
    word_count = len(req.essay_content.strip().split())
    context_parts.append(f"Word Count: {word_count}")

    system = ESSAY_REVIEW_PROMPT + "\n\n" + "\n".join(context_parts)

    result = llm.invoke([
        SystemMessage(content=system),
        HumanMessage(content=req.essay_content.strip()),
    ])

    return EssayReviewResponse(feedback=result.content)
