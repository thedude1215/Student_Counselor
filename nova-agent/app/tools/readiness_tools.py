from langchain_core.tools import tool
from app.supabase_client import supabase
from app.tools.student_tools import get_current_user


@tool
def get_activities_and_honors() -> dict:
    """Get the student's extracurricular activities and honors/awards for advising on positioning."""
    if not get_current_user():
        return {"error": "No user context available."}

    activities = (
        supabase.table("activities")
        .select("title, role, organization, description, hours_per_week")
        .eq("profile_id", get_current_user())
        .execute()
    )
    honors = (
        supabase.table("honors")
        .select("title, level, year, description")
        .eq("profile_id", get_current_user())
        .execute()
    )

    result = {}
    acts = activities.data or []
    hons = honors.data or []

    if acts:
        result["activities"] = acts
    if hons:
        result["honors"] = hons
    if not acts and not hons:
        return {"message": "No activities or honors recorded yet."}
    return result


@tool
def get_application_readiness() -> dict:
    """Get the student's application readiness score and breakdown — profile completeness, college list balance, essay progress, task momentum."""
    if not get_current_user():
        return {"error": "No user context available."}

    uid = get_current_user()

    profile = (
        supabase.table("profiles")
        .select("gpa, sat_score, intended_major, class_year, grade_level, target_countries, interests")
        .eq("id", uid)
        .single()
        .execute()
    ).data or {}

    college_list = (
        supabase.table("college_list_items")
        .select("tier")
        .eq("profile_id", uid)
        .execute()
    ).data or []

    essays = (
        supabase.table("essays")
        .select("title, content")
        .eq("profile_id", uid)
        .execute()
    ).data or []

    tasks = (
        supabase.table("tasks")
        .select("status")
        .eq("profile_id", uid)
        .execute()
    ).data or []

    score = 0

    prof_fields = ["gpa", "sat_score", "intended_major", "class_year", "grade_level"]
    filled = sum(1 for k in prof_fields if profile.get(k))
    score += round((filled / len(prof_fields)) * 30)
    if profile.get("target_countries"):
        score += 5
    if profile.get("interests"):
        score += 5

    if college_list:
        score += 8
    if len(college_list) >= 4:
        score += 4
    tiers = set(c["tier"] for c in college_list)
    score += len(tiers) * 4

    if essays:
        score += 8
    substantial = sum(
        1 for e in essays
        if e.get("content") and len(e["content"].strip().split()) >= 100
    )
    score += min(substantial * 6, 12)

    if tasks:
        score += 5
    done = sum(1 for t in tasks if t.get("status") == "done")
    score += min(done * 2, 10)

    percent = min(score, 100)

    if percent < 35:
        label = "Getting started"
    elif percent < 70:
        label = "Building momentum"
    else:
        label = "On track"

    breakdown = {
        "profile_complete": f"{filled}/{len(prof_fields)} fields",
        "college_list": f"{len(college_list)} schools ({', '.join(sorted(tiers)) if tiers else 'none'})",
        "essays": f"{len(essays)} total, {substantial} substantial (100+ words)",
        "tasks": f"{len(tasks)} total, {done} completed",
    }

    gaps = []
    if filled < 3:
        gaps.append("Fill in academics (GPA, test scores)")
    if not college_list:
        gaps.append("Add target schools to your list")
    elif len(tiers) < 3:
        gaps.append("Balance list across reach/match/likely tiers")
    if not essays:
        gaps.append("Start your first essay draft")

    return {
        "readiness_percent": percent,
        "status": label,
        "breakdown": breakdown,
        "gaps": gaps,
    }
