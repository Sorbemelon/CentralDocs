# CentralDocs Storage Design

## Storage layers

MongoDB Atlas stores metadata, session state, document chunks, embeddings, chat records, references, usage, quota windows, and AI routing attempts.

AWS S3 stores file objects:

- seeded mock files.
- uploaded originals.
- generated Markdown documents.

Render local filesystem is temporary and must not be treated as durable storage.

## S3 object key patterns

Allowed CentralDocs object-key prefixes:

```text
mock/
demo-sessions/<sessionId>/uploads/
demo-sessions/<sessionId>/generated/
```

Examples:

```text
mock/orchid-retail/original/<documentId>/<safeFilename>
demo-sessions/<sessionId>/uploads/<documentId>/<safeFilename>
demo-sessions/<sessionId>/generated/<documentId>/<safeFilename>
```

Object keys are internal. Public DTOs and UI must not expose them.

## Upload original storage

Uploads save the original file to S3 before processing. If metadata creation fails after S3 save, backend cleanup should delete the orphan upload object when the key is under the safe upload prefix. Mock keys must never be deleted by upload cleanup.

Failed uploaded-document processing can be retried by reading the original object from S3 and rerunning the processing/indexing path.

## Generated document storage

Generated documents are written as Markdown, uploaded to S3 under the generated prefix, stored as normal Document records, indexed, previewable, downloadable, searchable, and attachable.

Filename defaults and uniqueness are handled before persistence. The default generated filename is `summary.md`, with numbered suffixes when needed.

## Download flow

1. User requests a download.
2. Backend verifies access through mock scope or demo session ownership.
3. Backend returns a time-limited presigned S3 URL from `POST /api/documents/:documentId/download-url`.
4. Browser uses the URL to download the file.

The download response can include safe filename and expiry metadata. It must not expose raw object keys or secrets.

## Soft delete and restore

User-created documents and folders are soft-deleted first.

Soft-deleted items:

- are hidden from active source lists.
- appear in Trash.
- are excluded from semantic search.
- are excluded from RAG retrieval.
- keep S3 objects until hard cleanup.

Restore returns eligible session-owned items to active state.

## Clear-session cleanup

Clear Session and expiry cleanup remove session-created S3 objects under:

```text
demo-sessions/<sessionId>/
```

Cleanup must preserve:

```text
mock/
```

Cleanup should also remove session-created MongoDB records and chunks. In production, quota usage remains preserved according to the quota policy even though workspace data is removed.

## Mock files

Mock files are global read-only demo assets. They are stored in S3 under `mock/` and seeded into MongoDB with stable public identity. Mock media files are real downloadable files after seeding.

Mock assets must not be removed by user delete, clear session, retry cleanup, upload orphan cleanup, or expired session cleanup.

## Safety rules

- Validate object keys before read/delete operations.
- Allow S3 original-object read only for safe CentralDocs prefixes.
- Reject path traversal and unsafe key shapes.
- Return safe storage errors without object-key or provider-secret leakage.
- Keep presigned URL generation behind access checks.
- Keep bucket private; use presigned URLs for downloads.

## Deployment checklist

- Configure S3 bucket, region, and credentials in backend environment.
- Keep bucket objects private.
- Configure CORS only for intended frontend origins when direct browser download behavior requires it.
- Ensure Render has backend environment variables for S3 and MongoDB.
- Seed mock files before expecting mock download URLs to work.
