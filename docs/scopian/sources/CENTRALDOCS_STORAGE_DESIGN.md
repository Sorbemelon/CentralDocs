# CentralDocs Storage Design

## Storage layers

MongoDB Atlas:

- metadata.
- folders.
- demo sessions.
- document chunks.
- embeddings.
- chat sessions/messages.
- references.
- AI routing attempts.
- usage events.

AWS S3:

- mock files.
- uploaded files.
- generated `.md`/`.txt` files.

Render local disk is not trusted for persistent data.

## S3 object key convention

```text
mock/orchid-retail/original/<documentId>/<safeFilename>

demo-sessions/<demoSessionId>/uploads/<documentId>/<safeFilename>
demo-sessions/<demoSessionId>/generated/<documentId>/<safeFilename>
```

Use sanitized filenames and generated document IDs. Do not trust raw user filenames as object keys.

## Download flow

1. User clicks Download.
2. Backend verifies document access through mock scope or demo session.
3. Backend creates time-limited S3 presigned URL or streams the file.
4. Browser downloads the file.

## Soft delete

User-deleted files/folders are soft-deleted until clear session or expiry.

Soft-deleted items:

- hidden from normal workspace.
- shown in Trash filter.
- excluded from semantic search.
- excluded from chat attachment selector.
- excluded from RAG retrieval.
- S3 object remains until hard cleanup.

Hard delete only on:

- clear session.
- session expiry cleanup.

## Mock files

Mock files are global and read-only. They are stored in S3 and metadata/chunks are seeded into MongoDB. Mock data must never be removed by demo cleanup.

## Generated files

Generated documents are written as `.md` or `.txt`, uploaded to S3, registered as Document records, indexed with Gemini Embedding 2, and can be previewed/downloaded/attached/cited.
