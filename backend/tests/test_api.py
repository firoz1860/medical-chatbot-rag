import ast
import io
from pathlib import Path

import pytest


def test_application_exposes_factory():
    tree = ast.parse(Path("app.py").read_text(encoding="utf-8"))
    assert any(isinstance(node, ast.FunctionDef) and node.name == "create_app" for node in tree.body)


@pytest.fixture
def app_client(tmp_path):
    from app import create_app

    calls = {"answers": [], "uploads": [], "deleted": []}

    def answer_question(question, history):
        calls["answers"].append((question, history))
        return {"answer": "Use the uploaded medical guidance.", "sources_found": True, "chunks_used": 1, "model": "gpt-4o"}

    def index_pdf(path, name):
        calls["uploads"].append((Path(path), name))
        return {"chunks_indexed": 2, "document": name}

    def delete_document(name):
        calls["deleted"].append(name)

    app = create_app({"TESTING": True, "UPLOAD_FOLDER": str(tmp_path), "ANSWER_QUESTION": answer_question, "PROCESS_AND_INDEX_PDF": index_pdf, "DELETE_DOCUMENT_CHUNKS": delete_document})
    return app.test_client(), calls, tmp_path


def test_health_does_not_call_rag_service(app_client):
    client, calls, _ = app_client
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    assert calls == {"answers": [], "uploads": [], "deleted": []}


def test_chat_passes_normalized_request_to_existing_rag_service(app_client):
    client, calls, _ = app_client
    response = client.post("/api/chat", json={"question": "  What is asthma?  ", "chat_history": [{"role": "user", "content": "Earlier question"}]})
    assert response.status_code == 200
    assert response.get_json()["answer"] == "Use the uploaded medical guidance."
    assert calls["answers"] == [("What is asthma?", [{"role": "user", "content": "Earlier question"}])]


@pytest.mark.parametrize("payload", [{}, {"question": "   "}, {"question": "asthma", "chat_history": "not a list"}, {"question": "asthma", "chat_history": [{"role": "system", "content": "bad"}]}])
def test_chat_rejects_invalid_requests(app_client, payload):
    client, calls, _ = app_client
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 400
    assert "error" in response.get_json()
    assert calls["answers"] == []


def test_chat_hides_unexpected_provider_errors(tmp_path):
    from app import create_app
    def unavailable(*_):
        raise RuntimeError("OPENAI_API_KEY=super-secret")
    app = create_app({"TESTING": True, "UPLOAD_FOLDER": str(tmp_path), "ANSWER_QUESTION": unavailable})
    response = app.test_client().post("/api/chat", json={"question": "asthma"})
    assert response.status_code == 500
    assert "super-secret" not in response.get_json()["error"]


def test_upload_uses_safe_document_name_and_removes_temp_file(app_client):
    client, calls, upload_folder = app_client
    response = client.post("/api/upload", data={"file": (io.BytesIO(b"%PDF-1.4 example"), "../../report.pdf")})
    assert response.status_code == 200
    assert response.get_json()["document"] == "report.pdf"
    temporary_path, document_name = calls["uploads"][0]
    assert document_name == "report.pdf"
    assert temporary_path.name != document_name
    assert not temporary_path.exists()
    assert list(upload_folder.iterdir()) == []


def test_upload_rejects_non_pdf_files(app_client):
    client, calls, _ = app_client
    response = client.post("/api/upload", data={"file": (io.BytesIO(b"not a PDF"), "notes.txt")})
    assert response.status_code == 400
    assert calls["uploads"] == []


def test_delete_preserves_document_contract(app_client):
    client, calls, _ = app_client
    response = client.delete("/api/delete/report.pdf")
    assert response.status_code == 200
    assert calls["deleted"] == ["report.pdf"]


def test_deployment_assets_are_secret_free():
    deployment_files = [
        Path("../render.yaml"),
        Path("../frontend/vercel.json"),
        Path("../.github/workflows/ci.yml"),
        Path("../.github/workflows/deploy.yml"),
    ]
    for file_path in deployment_files:
        assert file_path.is_file()
        assert "sk-" not in file_path.read_text(encoding="utf-8")


def test_deploy_secrets_are_gated_in_steps_not_job_conditions():
    workflow = Path("../.github/workflows/deploy.yml").read_text(encoding="utf-8")
    assert "secrets.RENDER_DEPLOY_HOOK_URL != ''" not in workflow
    assert "secrets.VERCEL_TOKEN != ''" not in workflow
    assert "if: env.RENDER_DEPLOY_HOOK_URL != ''" in workflow
    assert "if: >-\n          env.VERCEL_TOKEN != ''" in workflow


def test_vercel_spa_rewrite_is_in_the_frontend_project_root():
    config_path = Path("../frontend/vercel.json")
    assert config_path.is_file()
    assert '"destination": "/index.html"' in config_path.read_text(encoding="utf-8")
    assert not Path("../vercel.json").exists()
