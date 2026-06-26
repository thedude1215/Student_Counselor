import json
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.config import GEMINI_API_KEY
from app.supabase_client import supabase

# Gemini 768d cosine scores for relevant catalog matches typically land in the
# ~0.55–0.75 range, so 0.7 was filtering out good hits. 0.55 keeps relevant
# results while still dropping noise.
SIMILARITY_THRESHOLD = 0.55

# IMPORTANT: must match the stored document embeddings.
# gemini-embedding-001 defaults to 3072 dims, but the catalog was embedded at
# 768 dims (see server/scripts/backfillEmbeddings.js). A mismatch makes every
# vector search error out silently. Also use RETRIEVAL_QUERY task type to pair
# correctly with the RETRIEVAL_DOCUMENT embeddings stored for catalog rows.
EMBED_DIM = 768

embeddings_model = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=GEMINI_API_KEY,
    output_dimensionality=EMBED_DIM,
    task_type="RETRIEVAL_QUERY",
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
