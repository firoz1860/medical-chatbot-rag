# MedBot ? Medical RAG Chatbot

A React and Flask medical-document chatbot. The core pipeline remains unchanged: it creates SentenceTransformer embeddings, retrieves matching Pinecone chunks, and asks the configured OpenAI model to answer only from that medical context.

## Local development

### Backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt pytest
Copy-Item .env.example .env
```

Set `OPENAI_API_KEY` and `PINECONE_API_KEY` in `backend/.env`, then run:

```powershell
.\.venv\Scripts\python.exe -m pytest tests -v
.\.venv\Scripts\python.exe app.py
```

The API listens on `http://localhost:5000`; readiness is `GET /api/health` and does not initialize OpenAI, Pinecone, or the embedding model.

### Frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm test
npm run dev
```

Set `VITE_API_URL` to the API base ending in `/api`; the default is the local Flask API.

## Deployment

- Render uses `render.yaml` to host the Flask API from `backend/` with Gunicorn.
- Vercel hosts the Vite SPA from `frontend/`; `vercel.json` rewrites SPA routes to `index.html`.
- Add `OPENAI_API_KEY`, `PINECONE_API_KEY`, and a Vercel-only `CORS_ORIGINS` value in Render.
- Add `VITE_API_URL` in Vercel, set to the public Render API URL ending in `/api`.
- To enable GitHub Actions deployment, add `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VITE_API_URL` as repository secrets.

CI runs tests and a fresh frontend build on pull requests and `main`. Deploy jobs run only after successful CI on `main` and skip safely until their provider secrets are configured.

## Safety

MedBot can make mistakes and is not a substitute for a licensed medical professional. Upload only documents you are authorized to process.
