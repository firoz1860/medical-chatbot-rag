# MedBot RAG

<p align="center">
  <img src="assets/readme/medbot-rag-banner.png" alt="Abstract illustration of medical documents connected to an AI assistant" width="100%" />
</p>

<p align="center">
  A modern React + Flask medical-document assistant with a transparent, production-ready RAG workflow.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#api-and-ui">API and UI</a> |
  <a href="#deployment">Deployment</a>
</p>

## Overview

MedBot RAG lets users ask questions about authorized medical PDFs. The React interface communicates with a Flask API that embeds document chunks, retrieves relevant context from Pinecone, and asks the configured OpenAI model to answer from that context.

The core RAG behavior remains unchanged. This project improves the delivery layer around it: request validation, safe uploads, health feedback in the UI, dependable tests, and deployment-ready Render/Vercel configuration.

| Layer | Responsibility |
| --- | --- |
| React + Vite | Chat experience, PDF upload controls, service status feedback |
| Flask API | Validates requests and exposes chat, upload, document, and health routes |
| SentenceTransformer | Produces document and query embeddings |
| Pinecone | Stores and retrieves relevant document chunks |
| OpenAI | Produces a context-grounded response |

> **Privacy reminder:** Upload only medical documents you are authorized to process. Provider data-handling and retention settings are your responsibility to configure.

## Architecture

```text
PDF upload -> text extraction -> chunking -> SentenceTransformer embeddings -> Pinecone index

User question -> Flask validation -> query embedding -> Pinecone top-k retrieval
              -> existing RAG prompt + OpenAI -> answer returned to the React chat UI
```

The API has a lightweight readiness endpoint at `GET /api/health`. It does not initialize OpenAI, Pinecone, or the embedding model, so it is suitable for platform health checks and frontend status feedback.

## Quick start

### Prerequisites

- Python 3.12
- Node.js 18 or later
- OpenAI API key
- Pinecone API key and a configured index

### 1. Start the Flask API

```powershell
git clone https://github.com/firoz1860/medical-chatbot-rag.git
cd medical-chatbot-rag\backend

py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt pytest
Copy-Item .env.example .env
```

Set the required values in `backend/.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Generates answers from retrieved context. |
| `PINECONE_API_KEY` | Yes | Connects to the vector index. |
| `PINECONE_ENV` | Yes | Pinecone environment/region. |
| `PINECONE_INDEX` | Yes | Target index; default is `medical-chatbot`. |
| `CORS_ORIGINS` | Production | Comma-separated frontend origins allowed to call the API. |
| `MAX_UPLOAD_BYTES` | No | Maximum uploaded PDF size; default is 50 MB. |

Then test and run the API:

```powershell
.\.venv\Scripts\python.exe -m pytest tests -v
.\.venv\Scripts\python.exe app.py
```

The API starts at [http://localhost:5000](http://localhost:5000); readiness is [http://localhost:5000/api/health](http://localhost:5000/api/health).

### 2. Start the React application

In a second terminal:

```powershell
cd medical-chatbot-rag\frontend
npm ci
Copy-Item .env.example .env
npm test
npm run dev
```

For local development, `.env.example` already points `VITE_API_URL` to `http://localhost:5000/api`. Open the Vite URL shown in the terminal, normally [http://localhost:5173](http://localhost:5173).

## API and UI

### Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Lightweight service readiness check. |
| `POST` | `/api/chat` | Sends a question and optional conversation history to the existing RAG service. |
| `POST` | `/api/upload` | Validates, extracts, and indexes an authorized PDF. |
| `GET` | `/api/documents` | Lists indexed documents. |
| `DELETE` | `/api/documents/<filename>` | Removes a document and its associated vectors. |

The frontend checks `/api/health` and presents the current service state. This feedback does not make model-provider calls.

### Typical workflow

1. Start the API and frontend.
2. Upload an authorized PDF through the document panel.
3. Wait for indexing to finish.
4. Ask a concise question that can be answered from the uploaded content.
5. Use the response as informational assistance and verify anything important with a qualified clinician.

## Verification

Run all project checks before opening a pull request:

```powershell
# Backend
cd backend
.\.venv\Scripts\python.exe -m pytest tests -v
.\.venv\Scripts\python.exe -m compileall -q app.py config.py routes services utils

# Frontend
cd ..\frontend
npm test
npm run build
```

GitHub Actions runs backend tests, frontend tests, and a production frontend build for pull requests and pushes to `main`.

## Deployment

### Render - Flask API

`render.yaml` deploys the `backend/` directory with Gunicorn.

1. Create a Render Blueprint from this repository.
2. Add `OPENAI_API_KEY` and `PINECONE_API_KEY` as secret environment variables.
3. Set `CORS_ORIGINS` to the production Vercel URL, for example `https://your-app.vercel.app`.
4. Confirm Render uses `/api/health` for health checks.

### Vercel - React SPA

Deploy the `frontend/` directory as the Vercel project root. The included `frontend/vercel.json` preserves client-side SPA routes.

Set this environment variable in Vercel:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | Public Render API URL ending in `/api`, for example `https://medbot-rag-api.onrender.com/api` |

### GitHub Actions deployment

Continuous deployment runs only after successful CI on `main`. It is intentionally inactive until the relevant repository secrets are present:

| Provider | Secrets |
| --- | --- |
| Render | `RENDER_DEPLOY_HOOK_URL` |
| Vercel | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_API_URL` |

The workflows skip release steps safely when those secrets are absent.

## Project map

```text
backend/
  routes/                 API endpoints for chat, upload, documents, and health
  services/               Existing RAG, embeddings, and Pinecone integrations
  utils/                  PDF processing helpers
  tests/                  API, validation, upload, and deployment tests
frontend/
  src/                    React UI, chat features, and service status hook
  test/                   Node test suite
  vercel.json             SPA rewrite configuration
render.yaml               Render Blueprint for the Flask API
```

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Frontend says API is unavailable | Confirm Flask is running and `VITE_API_URL` ends in `/api`. |
| Browser blocks requests in production | Set Render `CORS_ORIGINS` to the exact Vercel origin. |
| Upload is rejected | Upload a PDF within `MAX_UPLOAD_BYTES`. |
| Chat returns a provider error | Verify the OpenAI/Pinecone keys, index name, and provider availability. |
| Health works but chat does not | The API can be ready while external providers are unavailable. |

## Safety

MedBot may produce incomplete or incorrect medical information. It is not a diagnostic, emergency, or treatment service, and it must not replace advice from a licensed healthcare professional. For urgent symptoms, contact local emergency services or a qualified clinician.
