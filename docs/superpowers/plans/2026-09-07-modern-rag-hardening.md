# Modern Medical RAG Chatbot Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Flask API and Vite/React medical RAG chatbot secure, observable, testable, and deployment-ready without changing its retrieval or answer behavior.

**Architecture:** Preserve the existing embed ? Pinecone retrieve ? OpenAI answer pipeline and API response shape. Add an app factory and strict boundary validation around it; the frontend polls the existing health endpoint and renders service state through a pure mapper. Render hosts the API and Vercel hosts the SPA.

**Tech Stack:** Python 3.11, Flask, Flask-CORS, PyMuPDF, Pinecone, OpenAI, pytest, React 18, Vite, Node test runner, GitHub Actions, Render, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-07-modern-rag-hardening-design.md`

## Global Constraints

- Do not change the RAG system prompt, model default, embedding model, chunk settings, Pinecone metadata schema, similarity threshold, or API success shape.
- API errors must not expose exception text or secrets in production.
- `VITE_API_URL` must stay environment-configured; do not hard-code a deployed API URL.
- All cloud deployment actions are inert until the documented GitHub secrets are supplied.

---

### Task 1: Factory-configurable API and request validation

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_api.py`
- Modify: `backend/app.py`
- Modify: `backend/config.py`
- Modify: `backend/routes/chat.py`

**Interfaces:**
- Consumes: `POST /api/chat` JSON `{ question, chat_history? }`.
- Produces: `create_app(test_config: dict | None = None) -> Flask`, `sanitize_history(value) -> list[dict[str, str]]`, and unchanged successful RAG payloads.

- [ ] **Step 1: Write failing API tests**

```python
def test_health_does_not_call_rag(client, monkeypatch):
    monkeypatch.setattr("routes.chat.answer_question", lambda *_: pytest.fail("called"))
    assert client.get("/api/health").get_json()["status"] == "ok"


def test_chat_rejects_invalid_history(client):
    response = client.post("/api/chat", json={"question": "asthma", "chat_history": "bad"})
    assert response.status_code == 400
```

- [ ] **Step 2: Run the failing tests**

Run: `py -m pytest backend/tests/test_api.py -v`

Expected: FAIL because the module is not factory-configurable and history is passed through unvalidated.

- [ ] **Step 3: Implement the minimal boundary changes**

Use `create_app`, configuration-driven `MAX_CONTENT_LENGTH`, `UPLOAD_FOLDER`, and CORS origins. Accept only a list of at most six history objects with role `user` or `assistant`, non-empty string content, and bounded content length. Return validation errors before calling `answer_question`; preserve the result it returns on success.

- [ ] **Step 4: Verify API tests**

Run: `py -m pytest backend/tests/test_api.py -v`

Expected: PASS without providers or model downloads.

- [ ] **Step 5: Commit the API boundary work**

```bash
git add backend/app.py backend/config.py backend/routes/chat.py backend/tests
git commit -m "feat: harden RAG API boundary"
```

### Task 2: Safe PDF upload lifecycle

**Files:**
- Modify: `backend/routes/upload.py`
- Modify: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: multipart `file` at `POST /api/upload` and an encoded document name at `DELETE /api/delete/<doc_name>`.
- Produces: a sanitized document name, unique temporary upload path, and guaranteed cleanup.

- [ ] **Step 1: Write failing upload tests**

```python
def test_upload_uses_safe_name_and_removes_temp_file(client, monkeypatch, tmp_path):
    monkeypatch.setattr("routes.upload.process_and_index_pdf", lambda path, name: {"chunks_indexed": 1, "document": name})
    response = client.post("/api/upload", data={"file": (io.BytesIO(b"%PDF"), "../../report.pdf")})
    assert response.status_code == 200
    assert list(tmp_path.iterdir()) == []
```

- [ ] **Step 2: Run the failing upload test**

Run: `py -m pytest backend/tests/test_api.py::test_upload_uses_safe_name_and_removes_temp_file -v`

Expected: FAIL because path construction trusts filename formatting.

- [ ] **Step 3: Implement secure temporary handling**

Use `secure_filename`, reject an empty sanitized name, generate `uuid4().hex` for the temporary path, keep the sanitized name as the Pinecone source name, and always remove the generated path. Handle oversized requests with a JSON 413 handler and log unexpected errors while returning generic production messages.

- [ ] **Step 4: Verify upload and deletion tests**

Run: `py -m pytest backend/tests/test_api.py -v`

Expected: PASS.

- [ ] **Step 5: Commit secure uploads**

```bash
git add backend/routes/upload.py backend/tests/test_api.py
git commit -m "fix: secure RAG document uploads"
```

### Task 3: RAG service unit boundaries

**Files:**
- Create: `backend/tests/test_services.py`
- Modify: `backend/services/rag_service.py`
- Modify: `backend/services/pinecone_service.py`

**Interfaces:**
- Consumes: valid `question`, sanitized history, text chunks, and finite embedding vectors.
- Produces: the existing `answer_question` success schema and finite Pinecone values.

- [ ] **Step 1: Write failing service tests**

```python
def test_answer_question_returns_existing_response_shape(monkeypatch):
    monkeypatch.setattr(rag_service, "embed_query", lambda _: [0.1])
    monkeypatch.setattr(rag_service, "query_similar_chunks", lambda _: ["context"])
    monkeypatch.setattr(rag_service.client.chat.completions, "create", fake_completion)
    assert rag_service.answer_question("question")["chunks_used"] == 1
```

- [ ] **Step 2: Run the failing test**

Run: `py -m pytest backend/tests/test_services.py -v`

Expected: FAIL until imports and client construction can be cleanly mocked under the factory test setup.

- [ ] **Step 3: Make service initialization test-friendly without changing behavior**

Keep the same prompt, retrieval calls, model, temperature, and max tokens. Move no external work into health handling, preserve lazy embedding/index behavior, and add only injectable or monkeypatchable client seams required by the tests.

- [ ] **Step 4: Run all backend tests**

Run: `py -m pytest backend/tests -v`

Expected: PASS.

- [ ] **Step 5: Commit service coverage**

```bash
git add backend/services backend/tests/test_services.py
git commit -m "test: cover RAG service boundaries"
```

### Task 4: Accurate React service feedback

**Files:**
- Create: `frontend/src/lib/serviceStatus.js`
- Create: `frontend/test/serviceStatus.test.js`
- Create: `frontend/src/hooks/useServiceStatus.js`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/hooks/useChat.js`
- Modify: `frontend/src/components/UploadPanel.jsx`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: `healthAPI.check()` resolution or rejection.
- Produces: `getServiceStatus({ isChecking, error })` returning `checking`, `online`, or `offline`, and a header badge that communicates the returned state.

- [ ] **Step 1: Write the failing Node unit test**

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { getServiceStatus } from '../src/lib/serviceStatus.js'

test('maps health states', () => {
  assert.equal(getServiceStatus({ isChecking: true }), 'checking')
  assert.equal(getServiceStatus({ error: new Error() }), 'offline')
  assert.equal(getServiceStatus({}), 'online')
})
```

- [ ] **Step 2: Run the failing test**

Run: `npm test`

Expected: FAIL because no test script or mapper exists.

- [ ] **Step 3: Implement the mapper, hook, and UI state**

Poll on mount and every 30 seconds, clear the timer on unmount, and avoid overlapping checks. Replace the static ?Online? badge with accessible checking/online/offline labels and correct all mojibake source strings to UTF-8 characters. Keep existing chat and upload contracts.

- [ ] **Step 4: Verify frontend test and build**

Run: `npm test; npm run build`

Expected: PASS.

- [ ] **Step 5: Commit service feedback**

```bash
git add frontend
git commit -m "feat: show RAG service health"
```

### Task 5: CI/CD and operator documentation

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `render.yaml`
- Create: `vercel.json`
- Modify: `backend/.env.example`
- Modify: `frontend/.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: provider configuration and optional GitHub secrets.
- Produces: CI status plus gated Render and Vercel production deployments on `main`.

- [ ] **Step 1: Write a failing configuration assertion**

```python
def test_deploy_configs_reference_no_real_secrets():
    assert "sk-" not in Path("render.yaml").read_text(encoding="utf-8")
    assert "PINECONE_API_KEY=" not in Path("backend/.env.example").read_text(encoding="utf-8")
```

- [ ] **Step 2: Run the failing test**

Run: `py -m pytest backend/tests/test_api.py::test_deploy_configs_reference_no_real_secrets -v`

Expected: FAIL until deployment configuration exists.

- [ ] **Step 3: Add provider configuration and workflows**

Render builds from `backend` with `pip install -r requirements.txt` and starts `gunicorn --bind 0.0.0.0:$PORT app:app`. Vercel rewrites SPA routes to `index.html`. CI runs backend pytest plus `npm ci`, `npm test`, and `npm run build`. Deployment runs only after CI on `main`, posts Render?s secret deploy hook, and calls Vercel CLI only when all Vercel secrets are present.

- [ ] **Step 4: Run the full local gate**

Run: `py -m compileall -q backend; py -m pytest backend/tests -v; npm test; npm run build`

Expected: PASS.

- [ ] **Step 5: Commit deployment readiness**

```bash
git add .github render.yaml vercel.json README.md backend/.env.example frontend/.env.example backend/tests
git commit -m "ci: add RAG deployment pipeline"
```
