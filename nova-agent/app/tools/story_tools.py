from langchain_core.tools import tool
from app.supabase_client import supabase


@tool
def search_stories(
    country: str | None = None,
    tags: list[str] | None = None,
    university: str | None = None,
    query: str | None = None,
) -> list[dict] | dict:
    """Find student success stories by country, tags, or university. Use to show inspiring examples."""
    q = supabase.table("stories").select(
        "name, country, university, major, title, excerpt, tags, year"
    )

    if country:
        q = q.ilike("country", f"%{country}%")
    if tags:
        q = q.contains("tags", tags)
    if university:
        q = q.ilike("university", f"%{university}%")
    if query:
        q = q.or_(f"name.ilike.%{query}%,title.ilike.%{query}%,university.ilike.%{query}%")

    result = q.limit(10).execute()
    if not result.data:
        return {"message": "No matching student stories found."}
    return result.data
