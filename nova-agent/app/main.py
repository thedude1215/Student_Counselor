from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import ChatRequest, ChatResponse, EssayReviewRequest, EssayReviewResponse
from app.graphs.chat_graph import run_chat
from app.llm import llm
from app.tools.student_tools import set_current_user
from app.prompts.system_prompts import ESSAY_REVIEW_PROMPT
from langchain_core.messages import SystemMessage, HumanMessage

app = FastAPI(title="Nova Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8787"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "nova-agent"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    reply, tools_used = run_chat(req.user_id, messages)
    return ChatResponse(reply=reply, tool_calls_made=tools_used)


@app.post("/api/essay-review", response_model=EssayReviewResponse)
def essay_review(req: EssayReviewRequest):
    set_current_user(req.user_id)

    context_parts = []
    if req.essay_title:
        context_parts.append(f"Essay Title: {req.essay_title}")
    if req.essay_prompt:
        context_parts.append(f"Prompt: {req.essay_prompt}")
    word_count = len(req.essay_content.strip().split())
    context_parts.append(f"Word Count: {word_count}")

    system = ESSAY_REVIEW_PROMPT + "\n\n" + "\n".join(context_parts)

    result = llm.invoke([
        SystemMessage(content=system),
        HumanMessage(content=req.essay_content.strip()),
    ])

    return EssayReviewResponse(feedback=result.content)
