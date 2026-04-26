import fitz  # PyMuPDF
from langchain.text_splitter import RecursiveCharacterTextSplitter
from config import config

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    doc = fitz.open(pdf_path)
    full_text = ""
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        full_text += page.get_text()
    doc.close()
    return full_text

def split_text_into_chunks(text: str) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    return splitter.split_text(text)

def process_pdf(pdf_path: str) -> list[str]:
    """Full pipeline: extract text and return chunks."""
    text = extract_text_from_pdf(pdf_path)
    if not text.strip():
        raise ValueError("No readable text found in the PDF.")
    chunks = split_text_into_chunks(text)
    return chunks
