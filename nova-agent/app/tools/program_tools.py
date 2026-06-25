from langchain_core.tools import tool
from app.supabase_client import supabase


@tool
def search_programs(
    discipline: str | None = None,
    cost_type: str | None = None,
    program_type: str | None = None,
    query: str | None = None,
) -> list[dict] | dict:
    """Search summer programs, research programs, and competitions by discipline, cost, or type."""
    q = supabase.table("programs").select(
        "id, name, host, discipline, type, cost_type, deadline, eligibility, description"
    )

    if discipline:
        q = q.contains("discipline", [discipline])
    if cost_type:
        q = q.eq("cost_type", cost_type)
    if program_type:
        q = q.eq("type", program_type)
    if query:
        q = q.or_(f"name.ilike.%{query}%,host.ilike.%{query}%,description.ilike.%{query}%")

    result = q.limit(10).execute()
    if not result.data:
        return {"message": "No programs found matching those criteria."}
    return result.data
