from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import GEMINI_API_KEY

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=GEMINI_API_KEY,
    temperature=0.7,
    max_output_tokens=1200,
)
