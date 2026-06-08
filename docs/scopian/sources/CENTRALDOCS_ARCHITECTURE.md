# CentralDocs Architecture

## High-level system

```text
React/Vite frontend on Vercel
        |
        v
Express API on Render
        |
        |-- MongoDB Atlas
        |     - demo sessions
        |     - folders
        |     - document metadata
        |     - chunks
        |     - vector search
        |     - chat sessions/messages
        |     - references
        |     - usage/routing logs
        |
        |-- AWS S3
        |     - mock files
        |     - user uploaded files
        |     - generated Markdown/text documents
        |
        |-- Gemini API
              - gemini-embedding-2 for embeddings
              - gemini-3.5-flash primary generation
              - gemini-3-flash-preview fallback
              - gemini-2.5-flash final fallback
```

## Deployment shape

The monorepo contains `frontend/` and `backend/`. Vercel uses `frontend/` as its project root. Render uses `backend/` as its service root. Backend mock assets live under `backend/mock-data/` because the Vercel frontend must not depend on files outside its root directory.

## Backend modules

```text
src/
  app.js
  server.js
  config/
  db/
  models/
  routes/
  middleware/
  services/
    demo/
    folders/
    documents/
    extraction/
    chunking/
    embeddings/
    search/
    chats/
    generation/
    storage/
    ai/
    cleanup/
  utils/
```

## Data ownership

- MongoDB is the metadata and vector-search source of truth.
- S3 is the binary/file source of truth.
- Render local filesystem is temporary only.
- Mock documents are global read-only demo assets.
- User uploads, user folders, chats, and generated documents belong to anonymous DemoSession records.

## Cold start behavior

Frontend calls `/api/health/warm` before bootstrapping the demo. The UI shows a clear server-starting status instead of appearing broken when Render cold starts.

## Public/private boundary

Public source docs live in `docs/scopian/sources/`. Private prompts, progress logs, and old AutumData repos are ignored and must not be pushed.
