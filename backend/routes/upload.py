import os
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename


upload_bp = Blueprint("upload", __name__)
ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.post("/upload")
def upload_pdf():
    temporary_path = None
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400

        document_name = secure_filename(file.filename)
        if not document_name or not allowed_file(document_name):
            return jsonify({"error": "Only PDF files are allowed"}), 400

        upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
        temporary_path = upload_folder / f"{uuid4().hex}-{document_name}"
        file.save(temporary_path)

        result = current_app.config["PROCESS_AND_INDEX_PDF"](str(temporary_path), document_name)
        return jsonify({
            "message": f"Successfully indexed {result['document']}",
            "chunks_indexed": result["chunks_indexed"],
            "document": result["document"],
        }), 200
    except ValueError:
        current_app.logger.info("Uploaded PDF could not be processed", exc_info=True)
        return jsonify({"error": "The PDF could not be processed."}), 422
    except Exception:
        current_app.logger.exception("PDF upload failed")
        return jsonify({"error": "The upload could not be completed. Please try again."}), 500
    finally:
        if temporary_path:
            try:
                os.remove(temporary_path)
            except FileNotFoundError:
                pass
            except OSError:
                current_app.logger.warning("Could not remove temporary upload: %s", temporary_path)


@upload_bp.delete("/delete/<doc_name>")
def delete_document(doc_name: str):
    if not doc_name.strip():
        return jsonify({"error": "Document name is required"}), 400
    try:
        current_app.config["DELETE_DOCUMENT_CHUNKS"](doc_name)
        return jsonify({"message": f"Deleted {doc_name} from knowledge base"}), 200
    except Exception:
        current_app.logger.exception("Document deletion failed")
        return jsonify({"error": "The document could not be deleted. Please try again."}), 500
