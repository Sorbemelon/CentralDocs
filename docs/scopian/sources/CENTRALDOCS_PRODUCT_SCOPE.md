# CentralDocs Product Scope

## Product identity

CentralDocs is a demo-first AI document workspace for digital transformation. It helps users centralize documents, manage folders, search by semantic meaning, chat with selected documents/folders, save chat sessions, cite source references, generate new documents from chat, and download uploaded or generated files.

CentralDocs is a clean new project. AutumData is a legacy reference only, not a migration source of truth.

## Core product loop

```text
Documents -> organized workspace -> extracted/optimized text -> embeddings -> semantic search -> grounded chat -> saved conversation -> generated downloadable document -> searchable document again
```

## Locked platform scope

- Frontend: React + Vite + Tailwind + shadcn/ui-compatible component system.
- Frontend deployment: Vercel from `/frontend`.
- Backend: Node.js + Express.
- Backend deployment: Render from `/backend`.
- Database/vector search: MongoDB Atlas and MongoDB Vector Search.
- Object storage: AWS S3 as default S3-compatible storage.
- Embeddings: Gemini Embedding 2 with 768-dimensional output.
- Generation: Gemini 3.5 Flash primary, Gemini 3 Flash Preview fallback, Gemini 2.5 Flash final fallback.
- Mode: anonymous demo session, no login/register friction.

## Core features

1. Landing page with project explanation, simple architecture, demo guide, and launch CTA.
2. Demo workspace with connected mock documents.
3. Folder/document management with create, rename, move, attach, download, and soft delete.
4. One-file-at-a-time upload with frontend and backend validation.
5. Semantic search over selected scope.
6. Chat with selected documents and folders.
7. Saved chat sessions with history-aware context.
8. Per-prompt attached context snapshot.
9. Per-answer references used, hidden in collapsed panel by default.
10. Generate document from chat via separate modal and free-form instruction.
11. Generated documents saved as real documents, stored in S3, indexed, downloadable, previewable, and attachable.
12. Clear session removes all session-created files/folders/chats/generated docs.
13. Render warm-up handling with explicit UI status.
14. Light theme default with dark-capable toggle.

## Explicit non-goals for first public demo

- Normal user registration/login.
- Team roles or permissions.
- Enterprise approval workflows.
- Bulk upload.
- Public user upload of audio/video/image/xlsx/pptx.
- PDF/DOCX export for generated documents.
- Real customer data.
- Long-running background queue infrastructure beyond simple status tracking.
- Permanent deletion per item; hard delete only on clear session or session expiry.
