import numpy as np
from sentence_transformers import SentenceTransformer
from config import config

_model = None

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"Loading embedding model: {config.EMBEDDING_MODEL}")
        _model = SentenceTransformer(config.EMBEDDING_MODEL)
    return _model

def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of text chunks."""
    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=32)
    # Replace NaN/inf with finite values so json.dumps doesn't raise ValueError
    embeddings = np.nan_to_num(embeddings, nan=0.0, posinf=1.0, neginf=-1.0)
    return embeddings.tolist()

def embed_query(query: str) -> list[float]:
    """Generate embedding for a single query string."""
    model = get_embedding_model()
    embedding = model.encode([query])
    embedding = np.nan_to_num(embedding, nan=0.0, posinf=1.0, neginf=-1.0)
    return embedding[0].tolist()
