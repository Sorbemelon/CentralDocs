# CentralDocs API Contract

All endpoints are under `/api`.

## Health

- `GET /health` - backend status.
- `GET /health/warm` - used by frontend to wake Render.
- `GET /health/dependencies` - safe MongoDB/S3/AI config status, no secrets.

## Demo session

- `POST /demo/session` - create or resume anonymous demo session.
- `GET /demo/session` - current session limits and usage.
- `POST /demo/bootstrap` - ensure mock workspace exists and return initial dashboard data.
- `POST /demo/clear` - hard delete session-created data and reset session.
- `GET /demo/guide` - demo steps and sample questions.

## Folders

- `GET /folders` - list folder tree.
- `POST /folders` - create user folder.
- `PATCH /folders/:folderId` - rename user folder.
- `DELETE /folders/:folderId` - soft-delete user folder and user-owned children.
- `POST /folders/:folderId/restore` - restore folder.
- `GET /folders/:folderId/documents` - list documents in folder.

## Documents

- `GET /documents` - list documents with filters including trash.
- `POST /documents/upload` - upload one supported file.
- `GET /documents/:documentId` - document detail.
- `GET /documents/:documentId/status` - processing status.
- `GET /documents/:documentId/preview` - optimized text/metadata preview.
- `PATCH /documents/:documentId/move` - move document to user folder.
- `DELETE /documents/:documentId` - soft-delete uploaded/generated document.
- `POST /documents/:documentId/restore` - restore uploaded/generated document.
- `POST /documents/:documentId/retry` - retry failed processing.
- `POST /documents/:documentId/download-url` - create presigned S3 download URL.

Mock documents are read-only. They can be previewed, downloaded, and attached, but not moved, renamed, or deleted.

## Trash

- `GET /trash` - list trashed session-created folders/documents.

Trash is displayed as a filter inside Documents.

## Semantic search

`POST /search/semantic`

Body:

```json
{
  "query": "What risks are mentioned in rollout materials?",
  "selectedDocumentIds": [],
  "selectedFolderIds": [],
  "topK": 6
}
```

Returns matching chunks with document metadata, source locators, excerpts, and similarity scores.

## Chat sessions

- `GET /chats` - list saved chats.
- `POST /chats` - create chat.
- `GET /chats/:chatId` - get chat with messages.
- `PATCH /chats/:chatId` - rename/archive chat.
- `DELETE /chats/:chatId` - archive/delete chat session.
- `PATCH /chats/:chatId/selection` - update current selected docs/folders.
- `POST /chats/:chatId/messages` - send prompt and generate answer.

Message request:

```json
{
  "content": "Compare the rollout risks from the slides and meeting audio.",
  "selectedDocumentIds": [],
  "selectedFolderIds": []
}
```

If no selection override is sent, backend uses current chat session selection.

## Generated documents

`POST /chats/:chatId/generated-documents`

Body:

```json
{
  "instruction": "Write a concise internal briefing with background, findings, risks, decisions, next steps, and references.",
  "filename": "orchid-rollout-brief.md",
  "includeReferences": true,
  "includeCurrentSelectedDocuments": true
}
```

Generated documents are saved as normal documents, uploaded to S3, indexed, downloadable, previewable, and attachable.

## Usage

- `GET /usage` - current session usage counters.
- `GET /status/operations/:operationId` - optional status for long operations.
