import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# LLM provider for chat/generation: "groq" (free, fast) or "gemini".
# Embeddings (RAG) always use Gemini — Groq has no embeddings API.
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()

# Model is configurable so you can swap without code changes.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Shared secret required on every request from the Express API. Without this,
# anyone who discovers the nova-agent URL can call its endpoints directly with
# an arbitrary user_id in the request body and read/write that user's data,
# since these endpoints use the Supabase service-role client (bypasses RLS).
AGENT_INTERNAL_SECRET = os.getenv("AGENT_INTERNAL_SECRET", "")
