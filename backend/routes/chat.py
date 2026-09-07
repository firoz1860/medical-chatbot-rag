from flask import Blueprint, current_app, jsonify, request


chat_bp = Blueprint("chat", __name__)
ALLOWED_HISTORY_ROLES = {"user", "assistant"}
MAX_HISTORY_ITEMS = 6


def sanitize_history(value) -> list[dict[str, str]]:
    """Validate and normalize the chat context accepted by the RAG service."""
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError("Chat history must be a list.")

    normalized = []
    max_content_length = current_app.config["MAX_HISTORY_CONTENT_LENGTH"]
    for message in value[-MAX_HISTORY_ITEMS:]:
        if not isinstance(message, dict):
            raise ValueError("Each chat history item must be an object.")
        role = message.get("role")
        content = message.get("content")
        if role not in ALLOWED_HISTORY_ROLES or not isinstance(content, str):
            raise ValueError("Chat history contains an invalid message.")
        content = content.strip()
        if not content or len(content) > max_content_length:
            raise ValueError("Chat history contains an invalid message.")
        normalized.append({"role": role, "content": content})
    return normalized


@chat_bp.post("/chat")
def chat():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get("question"), str):
        return jsonify({"error": "Missing required field: question"}), 400

    question = data["question"].strip()
    if not question:
        return jsonify({"error": "Question cannot be empty"}), 400
    if len(question) > current_app.config["MAX_QUESTION_LENGTH"]:
        return jsonify({"error": "Question is too long"}), 400

    try:
        chat_history = sanitize_history(data.get("chat_history"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    try:
        result = current_app.config["ANSWER_QUESTION"](question, chat_history)
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("RAG chat request failed")
        return jsonify({"error": "The service could not complete that request. Please try again."}), 500
