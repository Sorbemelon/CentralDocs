---
id: DEC-20260612-1639-user-centraldocs-data-model-storage-c-M4SD
type: decision
status: approved
view: main
user: "USER"
agent: "codex"
git: "main@a609a99"
created_at: 2026-06-12T16:39:45+07:00
tags:
  - "spec-sync"
  - "data-model"
  - "storage"
  - "mock-data"
  - "vector-search"
source_refs:
  - "docs/scopian/sources/CENTRALDOCS_DATA_MODEL.md"
  - "docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md"
  - "docs/scopian/sources/CENTRALDOCS_MOCK_DATA_SPEC.md"
user_reply_excerpt: "Don't generate a new file directly! Use scopian!"
approved_summary: "Current implementation includes DemoQuotaWindow hidden quota model, HMAC identity hash without raw IP storage, Mongoose models, DocumentChunk Vector Search storage, media_direct chunks, embeddingInputType, generatedMeta/mediaMeta, folderMockId and seeded mock public identity behavior, S3 mock/upload/generated prefixes, retry reading original S3 object, presigned download URLs, and mock preservation. Candidate should update existing data-model/storage/mock docs after user approval."
approval_mode: user_approved_buffer_text
---

# Decision: CentralDocs data model storage current behavior

Current implementation includes DemoQuotaWindow hidden quota model, HMAC identity hash without raw IP storage, Mongoose models, DocumentChunk Vector Search storage, media_direct chunks, embeddingInputType, generatedMeta/mediaMeta, folderMockId and seeded mock public identity behavior, S3 mock/upload/generated prefixes, retry reading original S3 object, presigned download URLs, and mock preservation. Candidate should update existing data-model/storage/mock docs after user approval.
