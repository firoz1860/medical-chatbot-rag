import time
import math
from pinecone import Pinecone, ServerlessSpec
from config import config

_index = None


def _is_host_url(value: str) -> bool:
    """Return True when the config value is a full host URL, not an index name."""
    return value.startswith("http") or ".pinecone.io" in value or ".svc." in value


def _sanitize_text(text: str) -> str:
    """Remove null bytes / control chars and truncate to Pinecone's metadata limit."""
    return text.replace('\x00', '').replace('\r', ' ')[:1000]


def _safe_float(v) -> float:
    """Coerce to a finite Python float; replace non-finite with 0."""
    try:
        f = float(v)
        return f if math.isfinite(f) else 0.0
    except (TypeError, ValueError):
        return 0.0


def get_index():
    global _index
    if _index is not None:
        return _index

    pc = Pinecone(api_key=config.PINECONE_API_KEY)
    index_value = config.PINECONE_INDEX.strip()

    if _is_host_url(index_value):
        # User pasted the Pinecone host URL — connect directly; index already exists
        print(f"Connecting to Pinecone index via host URL")
        _index = pc.Index(host=index_value)
    else:
        # Plain index name — create the index if it doesn't exist yet
        index_name = index_value
        if len(index_name) > 45:
            raise ValueError(
                f"PINECONE_INDEX '{index_name}' is longer than 45 characters. "
                "Set it to a short name (e.g. 'medical-chatbot') or paste the "
                "full host URL from your Pinecone dashboard."
            )

        existing_names = [idx.name for idx in pc.list_indexes()]
        if index_name not in existing_names:
            print(f"Creating Pinecone index: {index_name}")
            pc.create_index(
                name=index_name,
                dimension=384,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region=config.PINECONE_ENV),
            )
            # Serverless indexes take a few seconds to become ready
            for _ in range(30):
                status = pc.describe_index(index_name).status
                if status.get("ready", False):
                    break
                print("Waiting for Pinecone index to become ready...")
                time.sleep(2)

        _index = pc.Index(index_name)

    print("Pinecone index ready.")
    return _index


def upsert_chunks(chunks: list[str], embeddings: list[list[float]], doc_name: str) -> int:
    """Store chunks and their embeddings in Pinecone in safe batches."""
    index = get_index()

    vectors = []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        vectors.append({
            "id": f"{doc_name}-chunk-{i}",
            "values": [_safe_float(v) for v in emb],
            "metadata": {
                "text": _sanitize_text(chunk),
                "source": doc_name,
                "chunk_index": i,
            },
        })

    batch_size = 50
    total_upserted = 0

    for start in range(0, len(vectors), batch_size):
        batch = vectors[start : start + batch_size]
        for attempt in range(3):
            try:
                index.upsert(vectors=batch)
                total_upserted += len(batch)
                break
            except Exception as e:
                if attempt == 2:
                    raise
                print(f"Upsert batch {start}-{start+len(batch)} failed "
                      f"(attempt {attempt+1}): {e}. Retrying in {2**attempt}s...")
                time.sleep(2 ** attempt)

    print(f"Upserted {total_upserted}/{len(vectors)} vectors for '{doc_name}'")
    return total_upserted


def query_similar_chunks(query_embedding: list[float], top_k: int = None) -> list[str]:
    """Retrieve most relevant text chunks for a query embedding."""
    index = get_index()
    k = top_k or config.TOP_K_RESULTS
    result = index.query(
        vector=[_safe_float(v) for v in query_embedding],
        top_k=k,
        include_metadata=True,
    )
    return [
        match.metadata.get("text", "")
        for match in result.matches
        if match.score > 0.3
    ]


def delete_document_chunks(doc_name: str) -> None:
    """Delete all chunks for a specific document."""
    index = get_index()
    index.delete(filter={"source": {"$eq": doc_name}})
