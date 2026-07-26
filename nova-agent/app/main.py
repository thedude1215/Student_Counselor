import json
import traceback
from datetime import datetime

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.models import (
    ChatRequest, ChatResponse, EssayReviewRequest, EssayReviewResponse, EssaySuggestion,
    StrengthAnnotation, EssayCorrection,
    TaskSuggestRequest, TaskSuggestResponse, SuggestedTask,
    UniversitySuggestionsRequest, UniversitySuggestion, UniversitySuggestionsResponse,
    ListAnalysis, ListedSchoolNote,
    ScholarshipMatchRequest, ScholarshipMatch, ScholarshipMatchesResponse,
    ActivityReviewRequest, ActivityReviewResponse,
)
from app.graphs.chat_graph import run_chat, stream_chat
from app.llm import llm
from app.tools.student_tools import set_current_user
from app.prompts.system_prompts import (
    ESSAY_REVIEW_PROMPT, SUGGEST_TASKS_PROMPT,
    UNIVERSITY_SUGGESTIONS_PROMPT, LIST_ANALYSIS_PROMPT, ACTIVITY_REVIEW_PROMPT,
    SCHOLARSHIP_MATCH_PROMPT,
)
from app.supabase_client import supabase
from app.config import AGENT_INTERNAL_SECRET
from langchain_core.messages import SystemMessage, HumanMessage

app = FastAPI(title="Nova Agent", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8787", "http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def require_internal(x_internal_secret: str | None = Header(default=None)):
    """Every route below is called only by our own Express server, which has
    already verified the caller's Supabase JWT and resolved req.userId. CORS
    only blocks browsers, so without this check anyone who finds this URL
    could POST directly with any user_id and read/write that user's data
    (these routes use the service-role Supabase client, which bypasses RLS).
    Fails closed if the secret isn't configured, rather than silently trusting
    the open internet.
    """
    if not AGENT_INTERNAL_SECRET or x_internal_secret != AGENT_INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _check_rate(user_id: str, bucket: str, max_per_hour: int, window_seconds: int = 3600) -> bool:
    """Postgres-backed rate limiting, shared across serverless invocations
    (an in-process dict resets on every cold start under Vercel)."""
    try:
        result = supabase.rpc("check_rate_limit", {
            "p_user_id": user_id,
            "p_bucket": bucket,
            "p_max": max_per_hour,
            "p_window_seconds": window_seconds,
        }).execute()
        return bool(result.data)
    except Exception as exc:
        print(f"[Nova] check_rate_limit error for {bucket}: {type(exc).__name__}: {exc}")
        return True  # fail open — a DB hiccup shouldn't block every Nova request


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


@app.post("/api/chat", response_model=ChatResponse, dependencies=[Depends(require_internal)])
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


@app.post("/api/chat/stream", dependencies=[Depends(require_internal)])
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


@app.post("/api/essay-review", response_model=EssayReviewResponse, dependencies=[Depends(require_internal)])
def essay_review(req: EssayReviewRequest):
    if not _check_rate(req.user_id, "essay", 5):
        raise HTTPException(status_code=429, detail="Rate limit reached (5 reviews/day).")

    set_current_user(req.user_id)

    context_parts = []
    if req.university_name:
        context_parts.append(f"Target University: {req.university_name}")
    if req.essay_title:
        context_parts.append(f"Essay Title: {req.essay_title}")
    if req.essay_prompt:
        context_parts.append(f"Prompt: {req.essay_prompt}")
    word_count = len(req.essay_content.strip().split())
    context_parts.append(f"Word Count: {word_count}")

    system = ESSAY_REVIEW_PROMPT + "\n\n--- ESSAY CONTEXT ---\n" + "\n".join(context_parts)

    result = llm.invoke([
        SystemMessage(content=system),
        HumanMessage(content=req.essay_content.strip()),
    ])

    return _parse_essay_review(result.content, req.essay_content)


_ESSAY_CATEGORIES = {
    "specificity", "clarity", "impact", "structure", "authenticity", "grammar",
}


def _parse_essay_review(raw: str, essay_content: str) -> EssayReviewResponse:
    """Parse the LLM's JSON essay review.

    Strips code fences / stray prose, slices to the outer {...}, validates each
    suggestion, and keeps only quotes that actually appear in the essay (so the
    frontend can always locate and highlight them). Falls back to a single
    markdown-style blob in `overall` if JSON parsing fails, so the endpoint never
    500s on a bad generation.
    """
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text[:4].lower() == "json":
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    parsed = None
    if start != -1 and end != -1 and end > start:
        try:
            parsed = json.loads(text[start:end + 1])
        except Exception:
            parsed = None

    if not isinstance(parsed, dict):
        # Graceful fallback: surface the raw text so the user still sees something.
        return EssayReviewResponse(
            overall=(raw or "").strip()[:1200],
            score=0,
            strengths=[],
            suggestions=[],
            feedback=(raw or "").strip(),
        )

    overall = str(parsed.get("overall", "")).strip()
    try:
        score = int(parsed.get("score", 0))
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(10, score))

    strengths = [
        str(s).strip() for s in (parsed.get("strengths") or [])
        if isinstance(s, (str, int, float)) and str(s).strip()
    ][:6]

    haystack = essay_content or ""
    haystack_lower = haystack.lower()

    strength_annotations: list[StrengthAnnotation] = []
    for item in (parsed.get("strength_annotations") or []):
        if not isinstance(item, dict):
            continue
        quote = str(item.get("quote", "")).strip()
        comment = str(item.get("comment", "")).strip()
        if not quote or not comment:
            continue
        # Same rule as suggestions: only keep quotes the frontend can locate.
        if quote.lower() not in haystack_lower:
            continue
        strength_annotations.append(StrengthAnnotation(quote=quote, comment=comment))
        if len(strength_annotations) >= 4:
            break

    corrections: list[EssayCorrection] = []
    _CORRECTION_TYPES = {"spelling", "delete"}
    for item in (parsed.get("corrections") or []):
        if not isinstance(item, dict):
            continue
        original = str(item.get("original", "")).strip()
        corrected = str(item.get("corrected", "")).strip()
        ctype = str(item.get("type", "spelling")).strip().lower()
        if not original:
            continue
        if original.lower() not in haystack_lower:
            continue
        if ctype not in _CORRECTION_TYPES:
            ctype = "spelling"
        corrections.append(EssayCorrection(original=original, corrected=corrected, type=ctype))
        if len(corrections) >= 6:
            break

    suggestions: list[EssaySuggestion] = []
    for item in (parsed.get("suggestions") or []):
        if not isinstance(item, dict):
            continue
        quote = str(item.get("quote", "")).strip()
        suggestion = str(item.get("suggestion", "")).strip()
        if not quote or not suggestion:
            continue
        # Only keep quotes the frontend can actually locate in the essay.
        if quote.lower() not in haystack_lower:
            continue
        category = str(item.get("category", "")).strip().lower()
        if category not in _ESSAY_CATEGORIES:
            category = "clarity"
        issue = str(item.get("issue", "")).strip()
        suggestions.append(EssaySuggestion(
            quote=quote, category=category, issue=issue, suggestion=suggestion,
        ))
        if len(suggestions) >= 8:
            break

    return EssayReviewResponse(
        overall=overall, score=score, strengths=strengths,
        strength_annotations=strength_annotations, corrections=corrections,
        suggestions=suggestions, feedback="",
    )


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


@app.post("/api/tasks/suggest", response_model=TaskSuggestResponse, dependencies=[Depends(require_internal)])
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


# ── University suggestions (college list) ──

_ALLOWED_TIERS = {"reach", "match", "likely"}


def _parse_json_object(raw: str) -> dict | None:
    """Strip code fences / stray prose and parse the outer {...} object."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text[:4].lower() == "json":
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start:end + 1])
    except Exception:
        return None
    return parsed if isinstance(parsed, dict) else None


@app.post("/api/university-suggestions", response_model=UniversitySuggestionsResponse, dependencies=[Depends(require_internal)])
def university_suggestions(req: UniversitySuggestionsRequest):
    if not _check_rate(req.user_id, "uni_suggest", 3):
        raise HTTPException(status_code=429, detail="Rate limit reached (3 suggestion runs/day).")

    # 1. Student profile
    try:
        profile = (
            supabase.table("profiles")
            .select("full_name, grade_level, country, gpa, sat_score, intended_major, interests, target_countries, budget, goals")
            .eq("id", req.user_id)
            .single()
            .execute()
        ).data or {}
    except Exception:
        profile = {}

    # 2. Missing-info detection — don't generate generic recs on a thin profile.
    missing = []
    if not profile.get("gpa"):
        missing.append("Your GPA — the single biggest factor in tier placement")
    if not profile.get("sat_score"):
        missing.append("SAT/ACT score (or note that you're applying test-optional)")
    if not (profile.get("intended_major") or profile.get("interests")):
        missing.append("Intended major or academic interests")
    if len(missing) >= 2:
        return UniversitySuggestionsResponse(suggestions=[], missing_info=missing)

    # 3. Current college list (exclude from candidates)
    try:
        list_rows = (
            supabase.table("college_list_items")
            .select("university_id, tier, universities(name)")
            .eq("profile_id", req.user_id)
            .execute()
        ).data or []
    except Exception:
        list_rows = []
    on_list_ids = {r["university_id"] for r in list_rows if r.get("university_id")}
    on_list_names = [
        f"{(r.get('universities') or {}).get('name', '?')} ({r.get('tier')})"
        for r in list_rows
    ]

    # 4. Candidate universities from the catalog
    q = supabase.table("universities").select(
        "id, name, country, location, ranking, acceptance_rate, tuition, tags, financial_aid, sat_range, type, size"
    )
    targets = profile.get("target_countries") or []
    if isinstance(targets, list) and targets:
        q = q.in_("country", targets)
    try:
        candidates = (q.order("ranking").limit(40).execute()).data or []
    except Exception:
        candidates = []
    candidates = [c for c in candidates if c["id"] not in on_list_ids][:30]
    if not candidates:
        return UniversitySuggestionsResponse(
            suggestions=[],
            missing_info=["No catalog universities match your target countries — try broadening them in your profile"],
        )

    # 5. LLM call
    profile_lines = [f"{k}: {v}" for k, v in profile.items() if v not in (None, "", [])]
    human = (
        "STUDENT PROFILE:\n" + "\n".join(profile_lines)
        + "\n\nCURRENT COLLEGE LIST (do not re-recommend):\n"
        + ("\n".join(on_list_names) if on_list_names else "(empty)")
        + "\n\nCANDIDATE UNIVERSITIES:\n"
        + json.dumps(candidates, default=str)
    )
    try:
        result = llm.invoke([
            SystemMessage(content=UNIVERSITY_SUGGESTIONS_PROMPT),
            HumanMessage(content=human),
        ])
        raw = result.content if isinstance(result.content, str) else str(result.content)
    except Exception as exc:
        print(f"[Nova] university_suggestions LLM error: {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=502, detail="Nova could not generate suggestions. Try again.")

    parsed = _parse_json_object(raw) or {}
    valid_ids = {c["id"]: c["name"] for c in candidates}
    suggestions: list[UniversitySuggestion] = []
    for item in (parsed.get("suggestions") or []):
        if not isinstance(item, dict):
            continue
        uid = str(item.get("university_id", "")).strip()
        name = str(item.get("name", "")).strip()
        if uid not in valid_ids:
            continue
        tier = str(item.get("tier", "")).strip().lower()
        if tier not in _ALLOWED_TIERS:
            continue
        rationale = str(item.get("rationale", "")).strip()
        if not rationale:
            continue
        highlights = [
            str(h).strip() for h in (item.get("fit_highlights") or [])
            if isinstance(h, (str, int, float)) and str(h).strip()
        ][:3]
        suggestions.append(UniversitySuggestion(
            university_id=uid,
            name=name or valid_ids[uid],
            tier=tier,
            rationale=rationale,
            fit_highlights=highlights,
            strategy_note=str(item.get("strategy_note", "")).strip(),
        ))
        if len(suggestions) >= 8:
            break

    # 7. List analysis — review tier accuracy and balance of the student's current list.
    list_analysis: ListAnalysis | None = None
    if list_rows:
        list_detail = [
            {
                "name": (r.get("universities") or {}).get("name", "?"),
                "current_tier": r.get("tier", "match"),
            }
            for r in list_rows
        ]
        list_human = (
            "STUDENT PROFILE:\n" + "\n".join(profile_lines)
            + "\n\nCURRENT COLLEGE LIST:\n"
            + json.dumps(list_detail, default=str)
        )
        try:
            la_result = llm.invoke([
                SystemMessage(content=LIST_ANALYSIS_PROMPT),
                HumanMessage(content=list_human),
            ])
            la_raw = la_result.content if isinstance(la_result.content, str) else str(la_result.content)
            la_parsed = _parse_json_object(la_raw) or {}
            flags = []
            for f in (la_parsed.get("tier_flags") or []):
                if not isinstance(f, dict):
                    continue
                curr = str(f.get("current_tier", "")).strip().lower()
                sugg = str(f.get("suggested_tier", "")).strip().lower()
                if curr not in _ALLOWED_TIERS or sugg not in _ALLOWED_TIERS:
                    continue
                flags.append(ListedSchoolNote(
                    name=str(f.get("name", "")).strip(),
                    current_tier=curr,
                    suggested_tier=sugg if sugg != curr else None,
                    note=str(f.get("note", "")).strip(),
                ))
            list_analysis = ListAnalysis(
                balance_summary=str(la_parsed.get("balance_summary", "")).strip(),
                reach_count=int(la_parsed.get("reach_count", 0)),
                match_count=int(la_parsed.get("match_count", 0)),
                likely_count=int(la_parsed.get("likely_count", 0)),
                overall_advice=str(la_parsed.get("overall_advice", "")).strip(),
                tier_flags=flags,
            )
        except Exception as exc:
            print(f"[Nova] list_analysis LLM error: {type(exc).__name__}: {exc}")

    # Single non-blocking nudge when only one key field is missing.
    return UniversitySuggestionsResponse(suggestions=suggestions, missing_info=missing, list_analysis=list_analysis)


# ── Scholarship matches ──

_SCHOLARSHIP_TIERS = {"strong", "possible", "stretch"}


@app.post("/api/scholarship-matches", response_model=ScholarshipMatchesResponse, dependencies=[Depends(require_internal)])
def scholarship_matches(req: ScholarshipMatchRequest):
    if not _check_rate(req.user_id, "sch_match", 10):
        raise HTTPException(status_code=429, detail="Rate limit reached (10 match runs/hour).")

    # 1. Profile
    try:
        profile = (
            supabase.table("profiles")
            .select(
                "full_name, grade_level, class_year, country, gpa, sat_score, act_score, "
                "intended_major, interests, target_countries, budget, goals"
            )
            .eq("id", req.user_id)
            .single()
            .execute()
        ).data or {}
    except Exception:
        profile = {}

    # 2. Missing-info — need a home country and at least some academic/interest signal.
    missing = []
    if not profile.get("country"):
        missing.append("Your home country — it decides which scholarships you're eligible for")
    if not (profile.get("gpa") or profile.get("sat_score") or profile.get("act_score")):
        missing.append("At least one academic marker (GPA or a test score)")
    if not (profile.get("intended_major") or profile.get("interests")):
        missing.append("Intended major or academic interests")
    if len(missing) >= 2:
        return ScholarshipMatchesResponse(matches=[], missing_info=missing)

    # 3. Activities + honors — the leadership/impact signal that powers a real rationale.
    try:
        activities = (
            supabase.table("activities")
            .select("title, role, organization, description, activity_type")
            .eq("profile_id", req.user_id)
            .order("sort_order")
            .limit(12)
            .execute()
        ).data or []
    except Exception:
        activities = []
    try:
        honors = (
            supabase.table("honors")
            .select("title, level, description")
            .eq("profile_id", req.user_id)
            .order("sort_order")
            .limit(10)
            .execute()
        ).data or []
    except Exception:
        honors = []

    # 4. Catalog
    try:
        scholarships = (
            supabase.table("scholarships").select("*").order("sort_order").execute()
        ).data or []
    except Exception:
        scholarships = []
    if not scholarships:
        return ScholarshipMatchesResponse(matches=[], missing_info=["No scholarships in the catalog yet."])

    # 5. Deterministic eligibility gate — zero hallucination risk lives here.
    #    Product targets undergraduate applicants, so graduate-only awards are dropped.
    home = (profile.get("country") or "").strip().lower()
    eligible, ineligible_ids = [], []
    for s in scholarships:
        if s.get("level") == "graduate":
            ineligible_ids.append(s["id"])
            continue
        if home:
            allow = [c.strip().lower() for c in (s.get("eligible_countries") or [])]
            deny = [c.strip().lower() for c in (s.get("excluded_countries") or [])]
            if allow and home not in allow:
                ineligible_ids.append(s["id"])
                continue
            if home in deny:
                ineligible_ids.append(s["id"])
                continue
        eligible.append(s)

    if not eligible:
        return ScholarshipMatchesResponse(matches=[], missing_info=[], ineligible_ids=ineligible_ids)

    # 6. LLM scoring of the survivors
    profile_lines = [f"{k}: {v}" for k, v in profile.items() if v not in (None, "", [])]
    act_lines = [
        f"- {a.get('title', '?')}"
        + (f" ({a.get('role')})" if a.get("role") else "")
        + (f" — {a.get('description')}" if a.get("description") else "")
        for a in activities
    ]
    hon_lines = [
        f"- {h.get('title', '?')}" + (f" [{h.get('level')}]" if h.get("level") else "")
        for h in honors
    ]
    candidates = [
        {
            "scholarship_id": s["id"], "name": s["name"], "org": s["org"], "type": s["type"],
            "level": s["level"], "need_based": s["need_based"], "merit_based": s["merit_based"],
            "fields": s.get("fields") or [],
            "destination_countries": s.get("destination_countries") or [],
            "restriction_note": s.get("restriction_note") or "",
            "description": s.get("description") or "",
        }
        for s in eligible
    ]
    human = (
        "STUDENT PROFILE:\n" + "\n".join(profile_lines)
        + "\n\nACTIVITIES:\n" + ("\n".join(act_lines) if act_lines else "(none listed)")
        + "\n\nHONORS:\n" + ("\n".join(hon_lines) if hon_lines else "(none listed)")
        + "\n\nELIGIBLE CANDIDATE SCHOLARSHIPS:\n" + json.dumps(candidates, default=str)
    )
    try:
        result = llm.invoke([
            SystemMessage(content=SCHOLARSHIP_MATCH_PROMPT),
            HumanMessage(content=human),
        ])
        raw = result.content if isinstance(result.content, str) else str(result.content)
    except Exception as exc:
        print(f"[Nova] scholarship_matches LLM error: {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=502, detail="Nova could not rank scholarships. Try again.")

    parsed = _parse_json_object(raw) or {}
    valid_ids = {s["id"] for s in eligible}
    matches: list[ScholarshipMatch] = []
    seen = set()
    for item in (parsed.get("matches") or []):
        if not isinstance(item, dict):
            continue
        sid = str(item.get("scholarship_id", "")).strip()
        if sid not in valid_ids or sid in seen:
            continue
        try:
            score = int(item.get("match_score", 0))
        except (TypeError, ValueError):
            score = 0
        score = max(0, min(100, score))
        tier = str(item.get("tier", "")).strip().lower()
        if tier not in _SCHOLARSHIP_TIERS:
            tier = "strong" if score >= 80 else "possible" if score >= 55 else "stretch"
        matches.append(ScholarshipMatch(
            scholarship_id=sid,
            match_score=score,
            tier=tier,
            rationale=str(item.get("rationale", "")).strip(),
            why_fits=str(item.get("why_fits", "")).strip(),
        ))
        seen.add(sid)

    matches.sort(key=lambda m: m.match_score, reverse=True)
    return ScholarshipMatchesResponse(matches=matches, missing_info=[], ineligible_ids=ineligible_ids)


# ── Activity review ──

_ACTIVITY_RATINGS = {"strong", "good", "needs_work"}


@app.post("/api/activity-review", response_model=ActivityReviewResponse, dependencies=[Depends(require_internal)])
def activity_review(req: ActivityReviewRequest):
    if not _check_rate(req.user_id, "activity", 10):
        raise HTTPException(status_code=429, detail="Rate limit reached (10 activity reviews/hour).")

    if not req.description.strip():
        raise HTTPException(status_code=400, detail="Activity description is required.")

    parts = [f"Activity: {req.activity_title}"]
    if req.activity_type:
        parts.append(f"Type: {req.activity_type}")
    if req.role:
        parts.append(f"Role: {req.role}")
    if req.hours_per_week:
        parts.append(f"Hours/week: {req.hours_per_week}")
    if req.weeks_per_year:
        parts.append(f"Weeks/year: {req.weeks_per_year}")
    desc = req.description.strip()
    parts.append(f"Description ({len(desc)}/150 chars): {desc}")

    try:
        result = llm.invoke([
            SystemMessage(content=ACTIVITY_REVIEW_PROMPT),
            HumanMessage(content="\n".join(parts)),
        ])
        raw = result.content if isinstance(result.content, str) else str(result.content)
    except Exception as exc:
        print(f"[Nova] activity_review LLM error: {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=502, detail="Nova could not review this activity. Try again.")

    parsed = _parse_json_object(raw) or {}
    rating = str(parsed.get("rating", "")).strip().lower()
    if rating not in _ACTIVITY_RATINGS:
        rating = "good"
    feedback = str(parsed.get("feedback", "")).strip()
    rewrite = str(parsed.get("rewrite_example", "")).strip()[:150]
    if not feedback:
        raise HTTPException(status_code=502, detail="Nova returned an unreadable review. Try again.")

    return ActivityReviewResponse(rating=rating, feedback=feedback, rewrite_example=rewrite)
