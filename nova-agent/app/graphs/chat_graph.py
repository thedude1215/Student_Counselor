from langgraph.prebuilt import create_react_agent
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.llm import llm
from app.tools import ALL_TOOLS
from app.tools.student_tools import set_current_user
from app.prompts.system_prompts import NOVA_SYSTEM_PROMPT

agent = create_react_agent(llm, ALL_TOOLS)


def run_chat(user_id: str, messages: list[dict]) -> tuple[str, list[str]]:
    """Run the Nova chat agent and return (reply_text, tool_calls_made)."""
    set_current_user(user_id)

    langchain_messages = [SystemMessage(content=NOVA_SYSTEM_PROMPT)]

    for msg in messages:
        if msg["role"] == "user":
            langchain_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] in ("nova", "assistant", "model"):
            langchain_messages.append(AIMessage(content=msg["content"]))

    result = agent.invoke({"messages": langchain_messages})

    tool_calls_made = []
    reply_text = ""

    for msg in result["messages"]:
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls_made.append(tc["name"])
        if isinstance(msg, AIMessage) and msg.content and not msg.tool_calls:
            reply_text = msg.content

    if not reply_text:
        # Fallback: get the last AI message with content
        for msg in reversed(result["messages"]):
            if isinstance(msg, AIMessage) and msg.content:
                reply_text = msg.content
                break

    return reply_text, tool_calls_made
