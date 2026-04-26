from openai import OpenAI
from services.embeddings import embed_query, embed_texts
from services.pinecone_service import query_similar_chunks, upsert_chunks
from utils.pdf_processor import process_pdf
from config import config

client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are MedBot, an expert AI medical assistant. You answer medical questions
based strictly on the provided context from verified medical documents.

Guidelines:
- Always base your answers on the provided context
- If the context doesn't contain enough information, say so clearly
- Use simple, clear language that patients and medical professionals can understand
- Always recommend consulting a licensed doctor for personal medical decisions
- Do not make up or hallucinate medical information
- Structure your answers clearly with bullet points when listing symptoms, treatments, etc.
"""

def process_and_index_pdf(pdf_path: str, doc_name: str) -> dict:
    """Full pipeline: process PDF and store in Pinecone."""
    print(f"Processing PDF: {doc_name}")
    chunks = process_pdf(pdf_path)
    print(f"Generated {len(chunks)} chunks")
    embeddings = embed_texts(chunks)
    count = upsert_chunks(chunks, embeddings, doc_name)
    return {"chunks_indexed": count, "document": doc_name}

def answer_question(question: str, chat_history: list = None) -> dict:
    """RAG pipeline: embed query → retrieve context → generate answer."""
    if not question.strip():
        return {"error": "Question cannot be empty"}

    # 1. Embed the question
    query_embedding = embed_query(question)

    # 2. Retrieve relevant chunks from Pinecone
    context_chunks = query_similar_chunks(query_embedding)

    if not context_chunks:
        context = "No relevant medical documents found in the knowledge base."
        sources_found = False
    else:
        context = "\n\n---\n\n".join(context_chunks)
        sources_found = True

    # 3. Build messages for GPT-4o
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Include recent chat history (last 6 messages)
    if chat_history:
        for msg in chat_history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Add context + question
    user_message = f"""Context from medical knowledge base:
{context}

---

Question: {question}

Please answer based on the context above."""

    messages.append({"role": "user", "content": user_message})

    # 4. Generate answer with GPT-4o
    response = client.chat.completions.create(
        model=config.OPENAI_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=800
    )

    answer = response.choices[0].message.content

    return {
        "answer": answer,
        "sources_found": sources_found,
        "chunks_used": len(context_chunks),
        "model": config.OPENAI_MODEL
    }
