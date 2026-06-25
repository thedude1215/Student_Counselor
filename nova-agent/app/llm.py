from app.config import (
    LLM_PROVIDER,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GROQ_API_KEY,
    GROQ_MODEL,
)


def _build_llm():
    if LLM_PROVIDER == "groq":
        from langchain_groq import ChatGroq

        return ChatGroq(
            model=GROQ_MODEL,
            api_key=GROQ_API_KEY,
            temperature=0.7,
            max_tokens=2048,
        )

    # Default: Gemini
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.7,
        # Gemini 2.5 "thinking" tokens count against the output budget. With a small
        # max_output_tokens and an unbounded thinking budget, a longer conversation
        # context can spend the entire budget on hidden thinking and return an empty
        # answer (output_tokens=0). Cap thinking and give the visible reply headroom.
        max_output_tokens=2048,
        thinking_budget=1024,
    )


llm = _build_llm()
