from app.tools.university_tools import search_universities, compare_universities
from app.tools.program_tools import search_programs
from app.tools.student_tools import get_student_profile, get_college_list, add_to_college_list
from app.tools.story_tools import search_stories
from app.tools.task_tools import get_upcoming_tasks, create_task
from app.tools.readiness_tools import get_activities_and_honors, get_application_readiness

ALL_TOOLS = [
    search_universities,
    search_programs,
    search_stories,
    compare_universities,
    get_student_profile,
    get_college_list,
    get_upcoming_tasks,
    add_to_college_list,
    create_task,
    get_activities_and_honors,
    get_application_readiness,
]
