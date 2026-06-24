from datetime import datetime, timedelta
from langchain_core.tools import tool
from app.supabase_client import supabase
from app.tools.student_tools import _current_user_id


@tool
def get_upcoming_tasks() -> list[dict] | dict:
    """Get the student's upcoming tasks and deadlines for the next 30 days."""
    if not _current_user_id:
        return {"error": "No user context available."}

    cutoff = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    result = (
        supabase.table("tasks")
        .select("title, due_date, priority, status, universities(name)")
        .eq("profile_id", _current_user_id)
        .lte("due_date", cutoff)
        .order("due_date")
        .limit(15)
        .execute()
    )
    if not result.data:
        return {"message": "No upcoming tasks in the next 30 days."}
    return [
        {
            "title": t["title"],
            "due_date": t["due_date"],
            "priority": t["priority"],
            "status": t["status"],
            "university": t["universities"]["name"] if t.get("universities") else None,
        }
        for t in result.data
    ]
