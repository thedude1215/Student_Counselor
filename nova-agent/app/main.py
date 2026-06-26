import json
import time
import traceback
from datetime import datetime
from collections import defaultdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.models import (
    ChatRequest, ChatResponse, EssayReviewRequest, EssayReviewResponse,
    TaskSuggestRequest, TaskSuggestResponse, SuggestedTask,
)
from app.graphs.chat_graph import run_chat, stream_chat
from app.llm import llm
from app.tools.student_tools import set_current_user
from app.prompts.system_prompts import ESSAY_REVIEW_PROMPT, SUGGEST_TASKS_PROMPT
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


# ── Task suggestions ──

_ALLOWED_CATEGORIES = {
    "Essays", "Testing", "Documents", "Recommendations", "Financial Aid", "General",
}
_ALLOWED_PRIORITIES = {"low", "medium", "high"}


def _parse_suggested_tasks(raw: str) -> list[SuggestedTask]:
    """Robustly parse the LLM's JSON array of tasks.

    Llama-on-Groq sometimes wraps output in code fences or adds stray prose, so
    we strip fences and slice to the outer [...] before json.loads. Each item is
    validated and clamped to the allowed enums; invalid rows are dropped. Returns
    [] on any failure so the endpoint never 500s on a bad generation.
    """
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text[:4].lower() == "json":
            text = text[4:]
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1 or end < start:
        return []
    try:
        items = json.loads(text[start:end + 1])
    except Exception:
        return []
    if not isinstance(items, list):
        return []

    out: list[SuggestedTask] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()[:70]
        if not title:
            continue
        category = item.get("category")
        if category not in _ALLOWED_CATEGORIES:
            category = None
        priority = str(item.get("priority", "medium")).lower()
        if priority not in _ALLOWED_PRIORITIES:
            priority = "medium"
        out.append(SuggestedTask(title=title, category=category, priority=priority))
        if len(out) >= 6:
            break
    return out


def _suggest_university_context(university_id: str | None, university_name: str) -> str:
    if not university_id:
        return f"University: {university_name}."
    try:
        row = (
            supabase.table("universities")
            .select("name, location, country, type, acceptance_rate, description")
            .eq("id", university_id)
            .single()
            .execute()
        ).data or {}
    except Exception:
        row = {}
    name = row.get("name") or university_name
    parts = [f"University: {name}"]
    loc = row.get("location") or row.get("country")
    if loc:
        parts.append(f"Location: {loc}")
    if row.get("type"):
        parts.append(f"Type: {row['type']}")
    if row.get("acceptance_rate") is not None:
        parts.append(f"Acceptance rate: ~{row['acceptance_rate']}%")
    if row.get("description"):
        parts.append(str(row["description"])[:300])
    return ". ".join(parts)


def _suggest_student_context(user_id: str) -> str:
    try:
        profile = (
            supabase.table("profiles")
            .select("grade_level, intended_major, country, goals")
            .eq("id", user_id)
            .single()
            .execute()
        ).data or {}
    except Exception:
        profile = {}
    bits = []
    if profile.get("grade_level"):
        bits.append(f"Grade {profile['grade_level']}")
    if profile.get("intended_major"):
        bits.append(f"intended major {profile['intended_major']}")
    if profile.get("country"):
        bits.append(f"from {profile['country']}")
    if profile.get("goals"):
        bits.append(f"goal: {str(profile['goals'])[:160]}")
    return "Student: " + ", ".join(bits) + "." if bits else ""


@app.post("/api/tasks/suggest", response_model=TaskSuggestResponse)
def suggest_tasks(req: TaskSuggestRequest):
    if not _check_rate(req.user_id, "suggest", 10):
        raise HTTPException(status_code=429, detail="Rate limit reached (10 suggestions/hour).")

    uni_ctx = _suggest_university_context(req.university_id, req.university_name)
    student_ctx = _suggest_student_context(req.user_id)
    human = uni_ctx + ("\n" + student_ctx if student_ctx else "")

    try:
        result = llm.invoke([
            SystemMessage(content=SUGGEST_TASKS_PROMPT),
            HumanMessage(content=human),
        ])
        raw = result.content if isinstance(result.content, str) else str(result.content)
    except Exception as exc:
        print(f"[Nova] suggest_tasks LLM error: {type(exc).__name__}: {exc}")
        return TaskSuggestResponse(suggestions=[])

    return TaskSuggestResponse(suggestions=_parse_suggested_tasks(raw))
