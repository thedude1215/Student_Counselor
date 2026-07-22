from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    user_id: str
    messages: list[ChatMessage]
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    tool_calls_made: list[str] = []


class EssayReviewRequest(BaseModel):
    user_id: str
    essay_content: str
    essay_title: str | None = None
    essay_prompt: str | None = None
    university_name: str | None = None


class EssaySuggestion(BaseModel):
    quote: str               # exact phrase copied verbatim from the essay
    category: str            # specificity | clarity | impact | structure | authenticity | grammar
    issue: str               # what's weak about this phrase
    suggestion: str          # concrete, rewriteable fix


class StrengthAnnotation(BaseModel):
    quote: str                # exact phrase copied verbatim from the essay
    comment: str              # why this moment is effective


class EssayCorrection(BaseModel):
    original: str             # exact text as it appears in the essay
    corrected: str            # correct spelling, or "" if it should be deleted
    type: str = "spelling"    # "spelling" | "delete"


class EssayReviewResponse(BaseModel):
    overall: str = ""
    score: int = 0
    strengths: list[str] = []
    strength_annotations: list[StrengthAnnotation] = []
    corrections: list[EssayCorrection] = []
    suggestions: list[EssaySuggestion] = []
    # Legacy markdown blob — kept for backward compatibility / graceful fallback.
    feedback: str = ""


class TaskSuggestRequest(BaseModel):
    user_id: str
    university_id: str | None = None
    university_name: str


class SuggestedTask(BaseModel):
    title: str
    category: str | None = None
    priority: str = "medium"


class TaskSuggestResponse(BaseModel):
    suggestions: list[SuggestedTask] = []


class UniversitySuggestionsRequest(BaseModel):
    user_id: str


class UniversitySuggestion(BaseModel):
    university_id: str | None = None
    name: str
    tier: str                  # reach | match | likely
    rationale: str             # why it fits THIS student
    fit_highlights: list[str] = []
    strategy_note: str = ""


class ListedSchoolNote(BaseModel):
    name: str
    current_tier: str
    suggested_tier: str | None = None
    note: str


class ListAnalysis(BaseModel):
    balance_summary: str
    reach_count: int = 0
    match_count: int = 0
    likely_count: int = 0
    overall_advice: str
    tier_flags: list[ListedSchoolNote] = []


class UniversitySuggestionsResponse(BaseModel):
    suggestions: list[UniversitySuggestion] = []
    missing_info: list[str] = []
    list_analysis: ListAnalysis | None = None


class ActivityReviewRequest(BaseModel):
    user_id: str
    activity_title: str
    activity_type: str | None = None
    role: str | None = None
    description: str
    hours_per_week: str | int | None = None
    weeks_per_year: str | int | None = None


class ActivityReviewResponse(BaseModel):
    rating: str                # strong | good | needs_work
    feedback: str
    rewrite_example: str
