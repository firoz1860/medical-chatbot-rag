import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENAI_API_KEY     = os.getenv("OPENAI_API_KEY", "")
    PINECONE_API_KEY   = os.getenv("PINECONE_API_KEY", "")
    PINECONE_ENV       = os.getenv("PINECONE_ENV", "us-east-1")
    PINECONE_INDEX     = os.getenv("PINECONE_INDEX", "medical-chatbot")
    EMBEDDING_MODEL    = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    OPENAI_MODEL       = os.getenv("OPENAI_MODEL", "gpt-4o")
    CHUNK_SIZE         = int(os.getenv("CHUNK_SIZE", 500))
    CHUNK_OVERLAP      = int(os.getenv("CHUNK_OVERLAP", 50))
    TOP_K_RESULTS      = int(os.getenv("TOP_K_RESULTS", 5))

config = Config()
