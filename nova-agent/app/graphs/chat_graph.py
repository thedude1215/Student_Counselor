import re
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.llm import llm
from app.tools import ALL_TOOLS
from app.tools.student_tools import set_current_user
from app.prompts.system_prompts import NOVA_SYSTEM_PROMPT, WORKFLOW_PROMPTS
from app.services.context import build_rag_context

agent = create_react_agent(llm, ALL_TOOLS)

FOLLOW_UP_PATTERN = re.compile(
    r"^(what about|tell me more|how about|and |also |yes|no|ok|sure|thanks|"
    r"can you|could you|do they|does it|is it|are they|their |its |that |this |it )",
    re.IGNORECASE,
)

INTENT_PATTERNS = {
    "college_list_build": re.compile(
        r"(build|create|make|start|help).*(college|school|university).*(list|recommendation)|"
        r"recommend.*(school|universit|college)|"
        r"(find|suggest|what).*(school|universit|college).*(for me|should i|match)|"
        r"help me find (school|universit|college)",
        re.IGNORECASE,
    ),
    "strategy_review": re.compile(
        r"(review|check|assess|evaluate).*(strategy|application|progress|plan)|"
        r"am i on track|how.*(am i|is my).*(doing|progress|look)|"
        r"(what|where).*(should i|do i).*(focus|prioritize|work on)|"
        r"application (plan|strategy|review)",
        re.IGNORECASE,
    ),
    "deadline_prep": re.compile(
        r"(deadline|due date|what.*(due|coming up|upcoming))|"
        r"(prepare|prep|get ready).*(for|deadline|application)|"
        r"(when|what).*(submit|apply|due)|"
        r"(timeline|schedule|calendar).*(application|submission)",
        re.IGNORECASE,
    ),
}


def _detect_intent(message: str) -> str | None:
    for intent, pattern in INTENT_PATTERNS.items():
        if pattern.search(message):
            return intent
    return None


GREETING_PATTERN = re.compile(
    r"^(hi|hey|hello|yo|sup|hiya|howdy|hi there|good (morning|afternoon|evening)|"
    r"thanks|thank you|ok|okay|cool|great|nice|got it)[\s!.,]*(nova)?[\s!.,]*$",
    re.IGNORECASE,
)


def _needs_rewrite(message: str) -> bool:
    return len(message) < 40 or bool(FOLLOW_UP_PATTERN.match(message))


def _rewrite_query(message: str, recent_messages: list[dict]) -> str:
    # Greetings / acknowledgements never need search context — skip the LLM call
    # entirely (saves a Gemini request, which matters on the free-tier quota).
    if GREETING_PATTERN.match(message.strip()):
        return ""

    # First turn (no prior context) is already standalone — no rewrite needed.
    if len(recent_messages) <= 1:
        return message

    if not _needs_rewrite(message):
        return message

    context_msgs = recent_messages[-4:]
    context = "\n".join(f"{m['role']}: {m['content'][:200]}" for m in context_msgs)

    rewrite_prompt = (
        "Given this conversation, rewrite the user's latest message as a standalone "
        "search query for finding relevant universities, programs, or student stories. "
        "Return ONLY the search query, nothing else. "
        "If the message is a greeting or doesn't need search context, return SKIP."
    )

    result = llm.invoke([
        SystemMessage(content=rewrite_prompt),
        HumanMessage(content=f"Conversation:\n{context}\n\nLatest message: {message}"),
    ])

    rewritten = result.content.strip()
    if rewritten.upper() == "SKIP":
        return ""
    return rewritten


def _content_to_text(content) -> str:
    """Normalize an AIMessage's content to plain text.

    Newer Gemini models (via the google-genai SDK) return content as a list of
    blocks like [{"type": "text", "text": "..."}, ...] rather than a plain
    string. Extract and join the text blocks; ignore non-text parts (e.g.
    thought signatures / inline data).
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                if block.get("type") == "text" and block.get("text"):
                    parts.append(block["text"])
                elif "text" in block and isinstance(block["text"], str):
                    parts.append(block["text"])
        return "".join(parts)
    return str(content) if content else ""


def _build_messages(system_prompt: str, messages: list[dict]) -> list:
    langchain_messages = [SystemMessage(content=system_prompt)]
    for msg in messages:
        if msg["role"] == "user":
            langchain_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] in ("nova", "assistant", "model"):
            langchain_messages.append(AIMessage(content=msg["content"]))
    return langchain_messages


# Strips a trailing malformed function-call blob that some models (e.g. Llama on
# Groq) append after an otherwise-complete answer, e.g. "<function=foo({...})>".
_TRAILING_FUNCTION_CALL = re.compile(r"\s*<function=.*?>\s*$", re.DOTALL)


def _salvage_failed_generation(exc: Exception) -> str:
    """If a tool-call validation failed, recover the model's text answer.

    Groq returns the full generated text in `failed_generation` when it rejects a
    malformed tool call. That text is usually a perfectly good reply with a stray
    function-call tag at the end — strip the tag and use it.
    """
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        text = body.get("error", {}).get("failed_generation")
        if text:
            return _TRAILING_FUNCTION_CALL.sub("", text).strip()
    return ""


def _fallback_reply(langchain_messages: list) -> str:
    """Last-resort answer: call the LLM directly with no tools bound."""
    try:
        result = llm.invoke(langchain_messages)
        return _content_to_text(result.content)
    except Exception as e:
        print(f"[Nova] fallback reply failed: {e}")
        return ""


def run_chat(user_id: str, messages: list[dict]) -> tuple[str, list[str]]:
    """Run the Nova chat agent and return (reply_text, tool_calls_made)."""
    set_current_user(user_id)

    latest_message = messages[-1]["content"] if messages else ""

    intent = _detect_intent(latest_message)
    workflow_prompt = WORKFLOW_PROMPTS.get(intent, "") if intent else ""

    search_query = _rewrite_query(latest_message, messages)

    rag_context = ""
    if search_query:
        try:
            rag_context = build_rag_context(search_query, user_id)
        except Exception as e:
            print(f"[Nova] RAG context error: {e}")

    system_prompt = NOVA_SYSTEM_PROMPT + workflow_prompt + rag_context
    langchain_messages = _build_messages(system_prompt, messages)

    try:
        result = agent.invoke({"messages": langchain_messages})
    except Exception as e:
        # Tool-calling can fail (e.g. a model emits a malformed tool call that
        # Groq rejects). Salvage the model's text, else answer without tools.
        print(f"[Nova] agent.invoke failed: {e}")
        salvaged = _salvage_failed_generation(e)
        reply_text = salvaged or _fallback_reply(langchain_messages)
        return reply_text, []

    tool_calls_made = []
    reply_text = ""

    for msg in result["messages"]:
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls_made.append(tc["name"])
        if isinstance(msg, AIMessage) and msg.content and not msg.tool_calls:
            reply_text = _content_to_text(msg.content)

    if not reply_text:
        for msg in reversed(result["messages"]):
            if isinstance(msg, AIMessage) and msg.content:
                reply_text = _content_to_text(msg.content)
                if reply_text:
                    break

    if not reply_text:
        reply_text = _fallback_reply(langchain_messages)

    return reply_text, tool_calls_made


def stream_chat(user_id: str, messages: list[dict]):
    """Stream the Nova chat agent, yielding events as they happen."""
    set_current_user(user_id)

    latest_message = messages[-1]["content"] if messages else ""

    intent = _detect_intent(latest_message)
    workflow_prompt = WORKFLOW_PROMPTS.get(intent, "") if intent else ""

    search_query = _rewrite_query(latest_message, messages)

    rag_context = ""
    if search_query:
        try:
            rag_context = build_rag_context(search_query, user_id)
        except Exception as e:
            print(f"[Nova] RAG context error: {e}")

    system_prompt = NOVA_SYSTEM_PROMPT + workflow_prompt + rag_context
    langchain_messages = _build_messages(system_prompt, messages)

    tool_calls_made = []
    final_text = ""

    try:
        for event in agent.stream({"messages": langchain_messages}, stream_mode="updates"):
            for node_name, node_output in event.items():
                msgs = node_output.get("messages", [])
                for msg in msgs:
                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        for tc in msg.tool_calls:
                            tool_calls_made.append(tc["name"])
                            yield {"type": "tool_call", "name": tc["name"]}

                    if isinstance(msg, AIMessage) and msg.content and not getattr(msg, "tool_calls", None):
                        text = _content_to_text(msg.content)
                        if text:
                            final_text = text
                            yield {"type": "text", "content": text}
    except Exception as e:
        # Tool-calling failed mid-stream (e.g. malformed tool call rejected by
        # Groq). Salvage the model's text, else answer without tools.
        print(f"[Nova] agent.stream failed: {e}")
        if not final_text:
            final_text = _salvage_failed_generation(e) or _fallback_reply(langchain_messages)
            if final_text:
                yield {"type": "text", "content": final_text}

    if not final_text:
        # Model returned no usable text (e.g. empty Gemini response). Emit a
        # graceful fallback so the UI never shows a blank message bubble.
        final_text = "Sorry — I didn't catch that. Could you rephrase or try again?"
        yield {"type": "text", "content": final_text}

    yield {"type": "done", "tool_calls_made": tool_calls_made}
