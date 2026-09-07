# Modern Medical RAG Chatbot Hardening Design

## Purpose

Harden the Flask API, improve service feedback in the React UI, and make separated backend/frontend deployment reproducible while preserving the RAG pipeline. The application continues to embed a query with the configured SentenceTransformer, retrieve from Pinecone, and call the configured OpenAI model with the existing medical safety prompt.

## Backend Architecture

The backend becomes factory-configurable so routes can be tested without real OpenAI, Pinecone, or embedding downloads. Configuration provides upload size, an absolute upload directory, a comma-separated CORS allowlist, production mode, and operational settings. `POST /api/chat` accepts a non-empty bounded question and only well-formed `user`/`assistant` history entries; it continues returning `answer`, `sources_found`, `chunks_used`, and `model` from `answer_question`.

`POST /api/upload` retains PDF indexing but uses `secure_filename` plus an internal unique temporary path. It rejects missing files, bad extensions, unreadable PDFs, and oversized bodies before invoking the unchanged extract/chunk/embed/upsert pipeline. The temporary file is always removed. `DELETE /api/delete/<doc_name>` keeps the current Pinecone document-delete behavior. Error responses are safe and consistent: validation/PDF errors are 400 or 422, while unexpected production errors are generic 500 messages and detailed errors are logged only on the server. `GET /api/health` reports readiness with no RAG initialization.

## Frontend Architecture

The existing React components retain their responsive chat-first layout, upload flow, chat history API contract, and medical disclaimer. A dedicated service-status hook polls `/api/health` at startup and after a bounded interval. The header will distinguish reachable, checking, and unavailable API states so an ?Online? badge cannot misrepresent an unavailable backend. Failed chat requests retain their current clear in-thread feedback and accessibility labels remain intact.

Source text will be normalized to UTF-8 so the welcome copy, notices, upload progress, and list separators render as intended. The UI will not claim a document is durably stored after a Render restart; uploaded source PDFs remain temporary by design while chunk vectors are owned by Pinecone.

## Runtime and Deployment

Render hosts the Flask API through a `render.yaml` Blueprint and Gunicorn. Vercel hosts the Vite SPA using `vercel.json` with an SPA rewrite. `VITE_API_URL` is configured in the Vercel project as the absolute API base URL ending in `/api`; it is never hard-coded in source.

GitHub Actions runs backend unit tests and a clean frontend build for pull requests and `main`. A deployment workflow runs only after CI succeeds on `main`: it triggers Render with `RENDER_DEPLOY_HOOK_URL`, and deploys a prebuilt Vercel artifact only when `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VITE_API_URL` secrets exist. Provider credentials, OpenAI/Pinecone keys, and URLs are referenced only as secrets or provider environment variables.

## Verification

Backend tests use fakes/mocks to cover health, chat validation, bounded sanitized history, upload validation, secure temporary cleanup, and safe errors without external services. Unit tests cover Pinecone text/vector sanitizers and RAG response construction. Frontend production build must pass and tests cover the status-state mapper without requiring a browser or provider. CI gates deployment and an explicit deployment guide documents every required secret.
