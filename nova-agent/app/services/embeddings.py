import json
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.config import GEMINI_API_KEY
from app.supabase_client import supabase

SIMILARITY_THRESHOLD = 0.7

embeddings_model = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=GEMINI_API_KEY,
)


def embed_text(text: str) -> list[float]:
    return embeddings_model.embed_query(text)


def semantic_search(table: str, query: str, limit: int = 5) -> list[dict]:
    embedding = embed_text(query)
    rpc_name = f"match_{table}"

    result = supabase.rpc(rpc_name, {
        "query_embedding": json.dumps(embedding),
        "match_count": limit,
    }).execute()

    rows = result.data or []
    return [r for r in rows if r.get("similarity", 0) >= SIMILARITY_THRESHOLD]
