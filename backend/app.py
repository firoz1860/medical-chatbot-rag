import os
from typing import Any

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

from config import config
from routes.chat import chat_bp
from routes.upload import upload_bp


def _answer_question(question: str, history: list[dict[str, str]]) -> dict[str, Any]:
    from services.rag_service import answer_question

    return answer_question(question, history)


def _process_and_index_pdf(path: str, name: str) -> dict[str, Any]:
    from services.rag_service import process_and_index_pdf

    return process_and_index_pdf(path, name)


def _delete_document_chunks(name: str) -> None:
    from services.pinecone_service import delete_document_chunks

    delete_document_chunks(name)


def create_app(test_config: dict[str, Any] | None = None) -> Flask:
    """Create the HTTP API without initializing model or vector services."""
    app = Flask(__name__)
    app.config.from_mapping(
        MAX_CONTENT_LENGTH=config.MAX_CONTENT_LENGTH,
        UPLOAD_FOLDER=config.UPLOAD_FOLDER,
        CORS_ORIGINS=config.CORS_ORIGINS,
        MAX_QUESTION_LENGTH=config.MAX_QUESTION_LENGTH,
        MAX_HISTORY_CONTENT_LENGTH=config.MAX_HISTORY_CONTENT_LENGTH,
        ANSWER_QUESTION=_answer_question,
        PROCESS_AND_INDEX_PDF=_process_and_index_pdf,
        DELETE_DOCUMENT_CHUNKS=_delete_document_chunks,
    )
    if test_config:
        app.config.update(test_config)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(upload_bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "message": "Medical Chatbot API is running"})

    @app.errorhandler(RequestEntityTooLarge)
    def file_too_large(_error):
        return jsonify({"error": "File too large. Maximum size is 50 MB."}), 413

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
