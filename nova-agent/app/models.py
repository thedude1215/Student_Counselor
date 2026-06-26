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


class EssayReviewResponse(BaseModel):
    feedback: str


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
