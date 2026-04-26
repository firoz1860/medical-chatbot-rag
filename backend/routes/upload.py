import os
import traceback
from flask import Blueprint, request, jsonify, current_app
from services.rag_service import process_and_index_pdf
from services.pinecone_service import delete_document_chunks

upload_bp = Blueprint('upload', __name__)

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route('/upload', methods=['POST'])
def upload_pdf():
    filepath = None
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if not file.filename:
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Only PDF files are allowed'}), 400

        # Sanitise filename for filesystem + Pinecone IDs
        filename = file.filename.replace(' ', '_')
        upload_folder = current_app.config['UPLOAD_FOLDER']
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)

        result = process_and_index_pdf(filepath, filename)

        return jsonify({
            'message': f'Successfully indexed {filename}',
            'chunks_indexed': result['chunks_indexed'],
            'document': result['document'],
        }), 200

    except Exception as e:
        # Always print the full traceback so errors are visible in the console
        print(f"[Upload ERROR] {type(e).__name__}: {e}")
        traceback.print_exc()
        status = 422 if isinstance(e, ValueError) else 500
        return jsonify({'error': str(e)}), status

    finally:
        # Always clean up the temp file if it was saved
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass


@upload_bp.route('/delete/<doc_name>', methods=['DELETE'])
def delete_document(doc_name):
    try:
        delete_document_chunks(doc_name)
        return jsonify({'message': f'Deleted {doc_name} from knowledge base'}), 200
    except Exception as e:
        print(f"[Delete ERROR] {e}")
        return jsonify({'error': str(e)}), 500
