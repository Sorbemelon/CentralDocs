# CentralDocs API Contract

All public backend endpoints are under `/api`. Frontend requests include `x-demo-session-id` once a demo session exists. Route responses must be DTO-shaped and must not expose raw storage keys, raw embeddings, secrets, local paths, provider prompts, or full provider errors.

## Health

- `GET /api/health` - basic backend status.
- `GET /api/health/warm` - Render warm-up route used before demo bootstrap.
- `GET /api/health/dependencies` - safe dependency/configuration summary for MongoDB, S3, Gemini, vector search, and hidden quota.

Dependency responses may show safe model names, dimensions, vector index/path, and configured/not-configured status. They must not show API keys, MongoDB connection strings, AWS secrets, S3 object keys, signed URLs, or hidden IP quota identity hashes.

## Demo session

- `POST /api/demo/session` - create or resume anonymous demo session.
- `GET /api/demo/session` - return current session, limits, usage, remaining values, and expiry.
- `POST /api/demo/bootstrap` - ensure seeded mock workspace and return workspace bootstrap data.
- `GET /api/demo/guide` - return demo guide and suggested questions.
- `POST /api/demo/clear` - clean session-created data and return a clear summary.

`POST /api/demo/clear` returns `clearPolicy`:

```json
{
  "clearPolicy": {
    "usageReset": false,
    "reason": "production_quota_window"
  }
}
```

In production, clear cleans data but preserves visible usage and hidden IP quota. In development/test, visible usage may reset according to configuration.

## Folders

- `GET /api/folders` - list folder tree.
- `POST /api/folders` - create user folder; `parentFolderId` is accepted where nesting is supported.
- `PATCH /api/folders/:folderId` - rename user folder.
- `DELETE /api/folders/:folderId` - soft-delete user folder and eligible user-owned descendants.
- `POST /api/folders/:folderId/restore` - restore a trashed user folder.
- `GET /api/folders/:folderId/documents` - list documents in a folder.

Mock folders are read-only and stable. User-created folder names should be unique within the relevant folder scope by adding a numbered suffix when needed.

## Documents

- `GET /api/documents` - list documents with filters.
- `GET /api/documents/:documentId` - document detail.
- `GET /api/documents/:documentId/preview` - safe content preview.
- `GET /api/documents/:documentId/status` - processing/status DTO with retry/download availability.
- `POST /api/documents/upload` - upload one supported public file using multipart field name `file`.
- `PATCH /api/documents/:documentId/move` - move a user/generated document to a user folder.
- `DELETE /api/documents/:documentId` - soft-delete uploaded/generated document.
- `POST /api/documents/:documentId/restore` - restore uploaded/generated document.
- `POST /api/documents/:documentId/retry` - retry failed uploaded-document processing from the original S3 object.
- `POST /api/documents/:documentId/download-url` - return a safe presigned download URL response.

The download-url route is the only intended public path that returns a presigned URL. It must still avoid raw object-key exposure.

## Trash

- `GET /api/trash` - list trashed session-created folders/documents.

Trash is represented in the compact workspace rather than a separate full page.

## Semantic search

`POST /api/search/semantic`

Request body:

```json
{
  "query": "What rollout risks are mentioned?",
  "selectedDocumentIds": [],
  "selectedFolderIds": [],
  "scope": "all",
  "topK": 15
}
```

The service accepts selected document and folder IDs, scope, optional file-kind filters where supported, and topK. Responses include result metadata, source locators, excerpts, scores, and citation-shaped references without raw vectors.

## Chat sessions

- `GET /api/chats` - list saved chats.
- `POST /api/chats` - create chat with a unique title.
- `GET /api/chats/:chatId` - get chat detail with messages and selection.
- `PATCH /api/chats/:chatId` - rename/archive chat.
- `DELETE /api/chats/:chatId` - delete/archive chat session according to current policy.
- `PATCH /api/chats/:chatId/selection` - update current selected documents/folders.
- `POST /api/chats/:chatId/messages` - send prompt and generate RAG answer.

Message request:

```json
{
  "content": "Summarize the rollout risks.",
  "selectedDocumentIds": [],
  "selectedFolderIds": []
}
```

The backend should only block no-context messages when there is truly no selected document/folder context. If provider failure occurs after a prompt is accepted, the client should receive a safe error shape and should not need to display fake assistant content.

## Generated documents

`POST /api/chats/:chatId/generated-documents`

Request body:

```json
{
  "instruction": "",
  "filename": "summary.md",
  "includeReferences": true,
  "includeCurrentSelectedDocuments": true
}
```

`instruction` is optional. Empty or missing instruction uses the default summary instruction: summarize the chat into a clear reusable document with key points, decisions, risks, next steps, and references when available.

Generated documents are saved as normal documents, written to S3, indexed, previewable, downloadable, searchable, and attachable.

## Limits and hidden quota errors

Cost-producing actions check both visible session usage and hidden IP-aware quota where enabled. Hidden IP quota applies to uploads, AI prompts, generated documents, and storage.

When hidden quota is exceeded, the API should return a safe limit error such as HTTP 429 with a generic message:

```json
{
  "error": {
    "code": "DEMO_LIMIT_REACHED",
    "message": "Demo usage limit reached for this period. Please try again later."
  }
}
```

The response must not mention IP address, IP hash, quota identity, or hidden limit internals.

## Public response safety

DTOs and route responses must hide:

- `objectKey`
- raw embeddings
- AWS access keys or secret keys
- Gemini API keys
- MongoDB URI
- local absolute paths
- hidden prompts
- raw provider request/response bodies
- S3 signed URLs except the explicit download-url response
