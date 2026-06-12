# CentralDocs Architecture

## System overview

```text
React/Vite frontend on Vercel
        |
        v
Express API on Render
        |
        |-- MongoDB Atlas
        |     - Mongoose models
        |     - demo sessions
        |     - folders and documents
        |     - document chunks
        |     - Atlas Vector Search
        |     - chats, messages, references, usage, AI routing
        |
        |-- AWS S3
        |     - seeded mock files
        |     - uploaded originals
        |     - generated Markdown documents
        |
        |-- Gemini
              - embeddings
              - chat answers
              - generated documents
              - direct mock media embedding during controlled seed/index work
```

## Deployment shape

- `frontend/` is the Vercel project root.
- `backend/` is the Render service root.
- There is no root package manifest.
- Frontend and backend dependencies remain scoped to their own folders.
- The frontend reads `VITE_API_BASE_URL` from `frontend/.env` in local live runs.
- The backend reads MongoDB, S3, Gemini, quota, and model configuration from `backend/.env` in local live runs.
- Real environment files are ignored and must not be committed.

## Backend runtime

The backend exposes an Express API under `/api`. It owns session creation, mock bootstrap, folder/document metadata, uploads, extraction/indexing, semantic search, chat, generated documents, downloads, trash/restore, usage, quota checks, and cleanup.

The backend uses Mongoose models for MongoDB persistence. MongoDB Atlas is the metadata source of truth and the vector-search source. AWS S3 is the file source of truth. Render local disk is temporary only.

## MongoDB Atlas and Vector Search

MongoDB stores application metadata and document chunks. Atlas Vector Search runs over the configured chunk embedding field.

The MongoDB connection string should include the database name in the URI path, for example `/centraldocs` before query parameters. Omitting the path may cause MongoDB or Mongoose to use a default database such as `test`.

Vector-search metadata is environment-driven:

- `MONGODB_VECTOR_INDEX_NAME`
- `MONGODB_VECTOR_PATH`
- `GEMINI_EMBEDDING_DIMENSIONS`

## AI and model configuration

AI behavior is configured through environment variables rather than scattered runtime literals. The default provider is Gemini. Embedding, generation primary model, generation fallback models, vector index name, vector path, and embedding dimensions are all centralized in backend config.

The generation lane supports fallback models and Gemini key-slot rotation. Health and dependency responses may show safe configuration status, model names, dimensions, and vector metadata, but must not expose API keys or raw provider requests.

## Health and warm-up

The frontend warms Render with `/api/health/warm` before demo bootstrap. The backend also exposes `/api/health` and `/api/health/dependencies` for readiness checks.

Dependency status should distinguish:

- backend awake/online.
- MongoDB configured and connected status.
- S3 configured status.
- Gemini provider/key configuration.
- model lane and vector metadata.
- hidden IP quota configuration without hashes or secrets.

## Demo and quota hardening

Demo session data has a 3-day lifetime. Hidden IP-aware quota has a 7-day reset window and protects uploads, AI prompts, generated documents, and storage at 3x the visible session limits.

Production Clear Session cleans session-created data but preserves visible quota usage and hidden IP quota. Development and test modes can reset visible usage when configured to do so.

## Live-readiness status

Local live smoke has verified MongoDB Atlas, S3, Gemini, mock seed/index/direct media embedding, semantic search, RAG chat, generated documents, upload, preview, download URLs, navigation persistence, clear session, and usage counters. Deployment still needs environment provisioning and a hosted smoke after Render/Vercel configuration.

## Public/private boundary

Public source docs live in `docs/scopian/sources/`. Private reports, local environment files, `_reference/`, and tool feedback remain ignored. Source docs should describe product and architecture decisions without copying private logs or secrets.
