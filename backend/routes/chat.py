import traceback
from flask import Blueprint, request, jsonify
from services.rag_service import answer_question

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json(silent=True)
        if not data or 'question' not in data:
            return jsonify({'error': 'Missing required field: question'}), 400

        question = data['question'].strip()
        if not question:
            return jsonify({'error': 'Question cannot be empty'}), 400

        chat_history = data.get('chat_history', [])
        result = answer_question(question, chat_history)
        return jsonify(result), 200

    except Exception as e:
        print(f"[Chat ERROR] {type(e).__name__}: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
