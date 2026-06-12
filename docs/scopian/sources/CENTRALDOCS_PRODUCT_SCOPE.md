# CentralDocs Product Scope

## Product identity

CentralDocs is a demo-first AI document workspace portfolio project for digital transformation. It lets a visitor launch an anonymous demo, explore a prepared document workspace, upload one supported file at a time, search by meaning, chat with selected documents and folders, inspect references, generate reusable Markdown documents from chat, and clean up demo data safely.

CentralDocs is a clean implementation. AutumData is reference material only; CentralDocs source specs and current implementation decisions control the product.

## Audience

Primary users are portfolio reviewers, recruiters, and engineers arriving cold from a link. They may only spend a few minutes, so the product must explain itself through the working demo rather than a long marketing flow.

Secondary users are the project author and reviewers running live demos. The expected session is desktop-first, short, anonymous, and bounded by hard demo limits.

Success means a first-time visitor can complete the loop of selecting sources, searching, chatting, generating, and downloading while trusting the answer references and status states.

## Product personality

CentralDocs should feel professional, grounded, compact, and evidence-led. It is a polished document workspace, not a chatbot mascot or AI spectacle. Confidence comes from references, statuses, counts, safe disabled states, and clear usage limits.

Product voice is plain and specific. UI copy should explain what will happen, why a control is disabled, and whether the user is in live backend mode or local fallback mode.

## Current product shape

- Public entry points are the landing page, the compact `/workspace` route, and the fallback route.
- The workspace is a single app surface with internal tabs for Chat, Search, Preview, and Generated.
- There is no normal login, register, account, role, or team-permission flow.
- Demo sessions are anonymous and identified through the demo session header and local browser session state.
- The current Usage display is the only user-facing quota display.
- Hidden IP-aware quota exists only on the server and is not shown in the frontend.

## Core product loop

```text
Launch demo -> organize sources -> select documents/folders -> search -> ask grounded questions -> inspect references -> generate a document -> preview/download -> clear session
```

The demo should be understandable without separate instructions: the workspace itself should make attach/search/chat/generate/download discoverable.

## Core flows

- Launch or continue a demo session from the landing page.
- Bootstrap the mock workspace and preserve seeded mock data.
- Browse a nested source tree with folders and documents.
- Create, rename, move, trash, restore, and manage user-owned folders/documents.
- Upload one supported public file at a time.
- Preview document content, inspect processing status, retry failed uploaded-document processing, and request a download URL.
- Run semantic search against all demo data or selected document/folder context.
- Create saved chat sessions and send RAG prompts with selected documents/folders.
- Keep references under assistant answers.
- Generate Markdown documents from chat with an optional instruction.
- Treat generated documents as normal documents that are stored, indexed, previewable, downloadable, and attachable.
- List trash and restore user-created items.
- Clear session-created data while preserving mock data.

## Platform scope

- Frontend: React, Vite, Tailwind, and local UI components under `frontend/`.
- Backend: Node.js, Express, Mongoose, and service seams under `backend/`.
- Database and vector search: MongoDB Atlas with Atlas Vector Search.
- Object storage: AWS S3 private objects with presigned download URLs.
- AI: Gemini embeddings and generation through environment-driven model configuration.
- Deployment target: frontend on Vercel and backend on Render, with no root package manifest.

## Public upload scope

Allowed public upload types:

- `.txt`
- `.md`
- `.csv`
- `.tsv`
- `.pdf`
- `.docx`

Public upload stays one file at a time. Rich media and spreadsheet/presentation files are available only as seeded mock data when the backend seed process provides them.

## Explicit non-goals

- Normal auth, registration, teams, roles, or long-lived user accounts.
- Separate full workspace routes for Documents, Search, Chat, Generated Documents, or Guide.
- Multi-file upload.
- Public upload of image, audio, video, `.xlsx`, or `.pptx` files.
- PDF or DOCX export for generated documents.
- Fixed generated-document templates.
- Chat slash commands or command-parser document generation.
- Public exposure of hidden IP quota, storage object keys, raw embeddings, provider prompts, or secrets.
- Hard delete from individual UI actions other than clear-session and expiry cleanup paths.

## Product anti-references

- Do not copy AutumData's orange/autumn styling.
- Avoid generic AI SaaS styling built around purple-blue spectacle.
- Avoid robot, mascot, or sparkly chatbot presentation.
- Avoid long marketing-page structure.
- Avoid dashboard bloat such as giant metric cards, oversized upload zones, or repeated guide content.
