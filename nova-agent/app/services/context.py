import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.supabase_client import supabase
from app.services.embeddings import semantic_search

_executor = ThreadPoolExecutor(max_workers=4)


def _get_student_profile(user_id: str) -> dict | None:
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return result.data


def _get_college_list(user_id: str) -> list[dict]:
    result = (
        supabase.table("college_list_items")
        .select("tier, universities(name, country, ranking, acceptance_rate)")
        .eq("profile_id", user_id)
        .execute()
    )
    return result.data or []


def _get_essay_summary(user_id: str) -> list[dict]:
    result = (
        supabase.table("essays")
        .select("title, prompt, updated_at")
        .eq("profile_id", user_id)
        .execute()
    )
    return result.data or []


def build_student_context(user_id: str) -> str:
    profile = _get_student_profile(user_id)
    college_list = _get_college_list(user_id)
    essays = _get_essay_summary(user_id)

    parts = []

    if profile:
        fields = []
        mapping = [
            ("full_name", "Name"), ("grade_level", "Grade"), ("country", "Country"),
            ("gpa", "GPA"), ("sat_score", "SAT"), ("budget", "Budget"), ("goals", "Goals"),
        ]
        for key, label in mapping:
            if profile.get(key):
                fields.append(f"{label}: {profile[key]}")
        for key, label in [("interests", "Interests"), ("target_countries", "Target Countries")]:
            val = profile.get(key)
            if val and isinstance(val, list) and len(val):
                fields.append(f"{label}: {', '.join(val)}")
        if fields:
            parts.append("STUDENT PROFILE:\n" + "\n".join(fields))

    if college_list:
        items = [
            f"{c.get('universities', {}).get('name', 'Unknown')} ({c['tier']})"
            for c in college_list
        ]
        parts.append(f"COLLEGE LIST:\n{', '.join(items)}")

    if essays:
        items = [f'"{e["title"]}"' for e in essays if e.get("title")]
        if items:
            parts.append(f"ESSAYS IN PROGRESS: {', '.join(items)}")

    if not parts:
        return ""
    return f"\n\nUSE THIS CONTEXT TO PERSONALIZE ADVICE:\n" + "\n\n".join(parts)


def build_rag_context(query: str, user_id: str) -> str:
    parts = []

    try:
        uni_results = semantic_search("universities", query, 5)
    except Exception:
        uni_results = []
    try:
        program_results = semantic_search("programs", query, 3)
    except Exception:
        program_results = []
    try:
        story_results = semantic_search("stories", query, 3)
    except Exception:
        story_results = []

    student_ctx = build_student_context(user_id)

    if uni_results:
        unis = "\n".join(
            f"- {u['name']} ({u.get('country', 'N/A')}) — "
            f"Ranking: {u.get('ranking', 'N/A')}, "
            f"Acceptance: {u.get('acceptance_rate', 'N/A')}%, "
            f"Tuition: ${u.get('tuition', 'N/A')}"
            f"{', offers financial aid' if u.get('financial_aid') else ''}"
            for u in uni_results
        )
        parts.append(f"RELEVANT UNIVERSITIES (from semantic search):\n{unis}")

    if program_results:
        progs = "\n".join(
            f"- {p['name']} ({p.get('host', 'N/A')}) — {p.get('type', '')}, {p.get('cost_type', '')}"
            for p in program_results
        )
        parts.append(f"RELEVANT PROGRAMS:\n{progs}")

    if story_results:
        stories = "\n".join(
            f"- {s.get('name', 'N/A')} from {s.get('country', 'N/A')} → "
            f"{s.get('university', 'N/A')} ({s.get('major', 'N/A')}): "
            f'"{s.get("title", s.get("excerpt", ""))}"'
            for s in story_results
        )
        parts.append(f"RELEVANT STUDENT STORIES:\n{stories}")

    if student_ctx:
        parts.append(student_ctx)

    if not parts:
        return ""
    return f"\n\n--- CONTEXT FROM RAG PIPELINE ---\n" + "\n\n".join(parts) + "\n--- END CONTEXT ---"
