from langchain_core.tools import tool
from app.supabase_client import supabase


@tool
def search_universities(
    country: str | None = None,
    tags: list[str] | None = None,
    max_acceptance_rate: float | None = None,
    financial_aid: bool | None = None,
    max_tuition: float | None = None,
    query: str | None = None,
) -> list[dict] | dict:
    """Search and filter universities by country, tags, acceptance rate, tuition, financial aid, or text query. Always use this instead of guessing university facts."""
    q = supabase.table("universities").select(
        "id, name, country, location, ranking, acceptance_rate, tuition, tags, financial_aid, sat_range, type, size, description"
    )

    if country:
        q = q.ilike("country", f"%{country}%")
    if tags:
        q = q.contains("tags", tags)
    if max_acceptance_rate is not None:
        q = q.lte("acceptance_rate", max_acceptance_rate)
    if financial_aid:
        q = q.eq("financial_aid", True)
    if max_tuition is not None:
        q = q.lte("tuition", max_tuition)
    if query:
        q = q.or_(f"name.ilike.%{query}%,location.ilike.%{query}%,description.ilike.%{query}%,country.ilike.%{query}%")

    result = q.order("ranking").limit(10).execute()
    if not result.data:
        return {"message": "No universities found matching those criteria. Try broadening your search."}
    return result.data


@tool
def compare_universities(university_names: list[str]) -> list[dict] | dict:
    """Get a structured side-by-side comparison of 2-4 universities by name. Returns key stats for each."""
    if len(university_names) < 2:
        return {"error": "Provide at least 2 university names to compare."}

    conditions = ",".join(f"name.ilike.%{n}%" for n in university_names[:4])
    result = (
        supabase.table("universities")
        .select("name, country, location, ranking, acceptance_rate, tuition, sat_range, financial_aid, tags, type, size, description")
        .or_(conditions)
        .limit(4)
        .execute()
    )
    if not result.data:
        return {"message": "Could not find those universities in the catalog."}
    return result.data
