from datetime import datetime, timedelta
from langchain_core.tools import tool
from app.supabase_client import supabase
from app.tools.student_tools import get_current_user


@tool
def get_upcoming_tasks() -> list[dict] | dict:
    """Get the student's upcoming tasks and deadlines for the next 30 days."""
    if not get_current_user():
        return {"error": "No user context available."}

    cutoff = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    result = (
        supabase.table("tasks")
        .select("title, due_date, priority, status, category, universities(name)")
        .eq("profile_id", get_current_user())
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
            "category": t.get("category"),
            "university": t["universities"]["name"] if t.get("universities") else None,
        }
        for t in result.data
    ]


@tool
def create_task(title: str, due_date: str, priority: str = "medium", category: str | None = None) -> dict:
    """Create a new task for the student. due_date format: YYYY-MM-DD. priority: low/medium/high."""
    if not get_current_user():
        return {"error": "No user context available."}
    if priority not in ("low", "medium", "high"):
        return {"error": "Priority must be 'low', 'medium', or 'high'."}

    row = {
        "profile_id": get_current_user(),
        "title": title,
        "due_date": due_date,
        "priority": priority,
        "status": "todo",
    }
    if category:
        row["category"] = category

    result = supabase.table("tasks").insert(row).execute()
    if not result.data:
        return {"error": "Failed to create task."}
    return {"success": True, "message": f"Created task: '{title}' due {due_date} ({priority} priority)."}
