# CentralDocs Data Model

CentralDocs uses Mongoose models backed by MongoDB Atlas. MongoDB stores metadata, session state, usage, chat history, chunks, and vector-search data. S3 stores files.

## DemoSession

Represents an anonymous demo workspace.

Important fields:

- `sessionId`
- `status`: active or expired.
- `createdAt`, `lastActiveAt`, `expiresAt`
- `limits`: uploads, chats, prompts, generated documents, folders, storage, prompt length, generated document size, query length, retrieval values.
- `usage`: uploaded file count, chat session count, AI prompt count, generated document count, storage bytes.
- `cleanupStatus`

Session-created data expires after `DEMO_SESSION_TTL_DAYS`, default 3 days.

## DemoQuotaWindow

Represents hidden IP-aware quota for anonymous abuse protection.

Important fields:

- `identityHash`
- `windowStartedAt`
- `expiresAt`
- `usage.uploadedFiles`
- `usage.aiPrompts`
- `usage.generatedDocuments`
- `usage.storageBytes`
- `createdAt`, `updatedAt`

`identityHash` is an HMAC-SHA256 hash of the normalized client IP using `DEMO_IP_HASH_SECRET`. Raw IP addresses are not stored. The hidden quota window resets after `DEMO_QUOTA_WINDOW_DAYS`, default 7 days.

## Folder

Important fields:

- `demoSessionId` nullable for mock folders.
- `scope`: mock or user.
- `mockId` and related stable public identity where seeded.
- `name`
- `parentFolderId`
- `path`
- `readOnly`
- `documentCount`
- `lifecycleStatus`: active or trashed.
- `deletedAt`, `deletedByDemoSessionId`, `restoreParentFolderId`
- timestamps.

Mock folders are read-only and stable. User folders belong to a demo session and can be nested, renamed, trashed, restored, and cleaned up.

## Document

Important fields:

- `demoSessionId` nullable for mock documents.
- `folderId`
- `folderMockId` for stable seeded mock folder identity.
- `scope`: mock, user, or generated.
- `sourceType`: mock, upload, or generated.
- `mockId` or other stable public mock identity when seeded.
- `title`
- `originalFilename`
- `downloadFilename`
- `fileExtension`
- `mimeType`
- `fileKind`
- `storageProvider`
- `objectKey` internal only.
- `sizeBytes`
- `checksum`
- `status`: uploaded, extracting, optimizing, chunking, embedding, ready, or failed.
- `statusMessage`
- `lifecycleStatus`: active or trashed.
- `contentStats`
- `generatedMeta`
- `mediaMeta`
- `readOnly`
- timestamps and optional expiry.

Public document DTOs must not expose `objectKey`.

## DocumentChunk

Important fields:

- `documentId`
- `demoSessionId` nullable for mock chunks.
- `folderId`
- `scope`
- `chunkIndex`
- `chunkKind`: text or media_direct.
- `content`
- `embedding`
- `embeddingModel`
- `embeddingDimensions`
- `embeddingInputType`
- `tokenEstimate`
- `sourceLocator`: page, slide, sheet, row range, section, or media timestamp.
- `mediaMeta`
- timestamps.

The embedding field is used by Atlas Vector Search. Raw embeddings are not part of public API DTOs.

## ChatSession

Important fields:

- `demoSessionId`
- `title`
- `currentSelectedDocumentIds`
- `currentSelectedFolderIds`
- `rollingSummary`
- `messageCount`
- `aiPromptCount`
- `archivedAt`
- `createdAt`, `updatedAt`, `lastMessageAt`

Chat titles should be unique for the active session by adding numbered suffixes when needed.

## ChatMessage

Important fields:

- `chatSessionId`
- `demoSessionId`
- `role`: user or assistant.
- `content`
- `status`: pending, complete, or failed.
- `attachedDocumentSnapshot`
- `attachedFolderSnapshot`
- `resolvedDocumentSnapshot`
- `referencesUsed`
- `aiMeta` internal only.
- timestamps.

Public message DTOs may include safe references, status, role, and content. They must not expose hidden prompts or provider internals.

## ReferenceUsed

Assistant references include:

- `citationNumber`
- `documentId`
- `documentTitle`
- `fileType`
- `folderName`
- `chunkId`
- source locator fields.
- `excerptPreview`
- `similarityScore`
- `usedFor`

Reference formatting dedupes source/chunk evidence and keeps citation order stable.

## UsageEvent

Usage events record accepted cost-producing actions and storage deltas where useful for audit and debugging. Clear Session cleanup can remove session-data logs when they are not required for quota enforcement.

## AiRoutingAttempt

AI routing attempts record safe metadata about embedding/chat/generated-document calls:

- `demoSessionId`
- `actionType`
- `model`
- `keySlot`
- `status`
- `errorType`
- `isRateLimit`
- `fallbackLevel`
- timestamp.

Do not expose keys or raw provider errors.

## Lifecycle and cleanup

- `lifecycleStatus=active` records appear in normal workspace lists.
- `lifecycleStatus=trashed` records appear in Trash and are excluded from search/RAG.
- Clear Session removes session-created user folders, uploaded documents, generated documents, chats/messages, chunks, and S3 objects under the session prefix.
- Mock folders/documents/chunks remain.
- Session/data expiry is 3 days by default.
- Hidden IP quota persists independently for 7 days by default.

## External vector index

The MongoDB Atlas Vector Search index is managed outside Mongoose. CentralDocs documents the configured index name, vector path, and dimensions, but does not create Atlas indexes implicitly unless a safe project script is explicitly used.
