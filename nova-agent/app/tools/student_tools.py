from langchain_core.tools import tool
from app.supabase_client import supabase

# user_id is injected via the graph state, stored in a module-level var per request
_current_user_id: str | None = None


def set_current_user(user_id: str):
    global _current_user_id
    _current_user_id = user_id


@tool
def get_student_profile() -> dict:
    """Get the current student's profile including grade, country, GPA, SAT, interests, target countries, and budget."""
    if not _current_user_id:
        return {"error": "No user context available."}

    result = (
        supabase.table("profiles")
        .select("full_name, grade_level, country, gpa, sat_score, interests, target_countries, budget, goals")
        .eq("id", _current_user_id)
        .single()
        .execute()
    )
    if not result.data:
        return {"message": "No profile found. The student hasn't filled in their profile yet."}
    return result.data


@tool
def get_college_list() -> list[dict] | dict:
    """Get the student's current college list with tier classifications (reach/match/likely)."""
    if not _current_user_id:
        return {"error": "No user context available."}

    result = (
        supabase.table("college_list_items")
        .select("tier, universities(id, name, country, ranking, acceptance_rate, tuition, financial_aid)")
        .eq("profile_id", _current_user_id)
        .order("created_at")
        .execute()
    )
    if not result.data:
        return {"message": "The student's college list is empty."}
    return [
        {
            "university": item["universities"]["name"] if item.get("universities") else "Unknown",
            "country": item["universities"].get("country") if item.get("universities") else None,
            "tier": item["tier"],
            "acceptance_rate": item["universities"].get("acceptance_rate") if item.get("universities") else None,
        }
        for item in result.data
    ]


@tool
def add_to_college_list(university_name: str, tier: str) -> dict:
    """Add a university to the student's college list. Tier must be 'reach', 'match', or 'likely'."""
    if not _current_user_id:
        return {"error": "No user context available."}
    if tier not in ("reach", "match", "likely"):
        return {"error": "Tier must be 'reach', 'match', or 'likely'."}

    uni_result = (
        supabase.table("universities")
        .select("id, name")
        .ilike("name", f"%{university_name}%")
        .limit(1)
        .execute()
    )
    if not uni_result.data:
        return {"error": f'University "{university_name}" not found in our catalog.'}

    uni = uni_result.data[0]

    existing = (
        supabase.table("college_list_items")
        .select("id")
        .eq("profile_id", _current_user_id)
        .eq("university_id", uni["id"])
        .limit(1)
        .execute()
    )
    if existing.data:
        return {"message": f"{uni['name']} is already on the student's college list."}

    supabase.table("college_list_items").insert({
        "profile_id": _current_user_id,
        "university_id": uni["id"],
        "tier": tier,
    }).execute()

    return {"success": True, "message": f"Added {uni['name']} to the college list as a {tier}."}
