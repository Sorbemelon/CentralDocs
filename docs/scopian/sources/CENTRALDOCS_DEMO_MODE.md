# CentralDocs Demo Mode

## Demo philosophy

CentralDocs is portfolio-first. Users should see value without registering.

Flow:

```text
Open app -> warm backend -> create/resume anonymous demo session -> load mock workspace -> user explores documents/search/chat/generation/downloads
```

## Demo limits

- Demo session lifetime: 3 days.
- Saved chat sessions: 5 per session.
- AI chat prompts: 10 per session.
- Generated documents: 3 per session.
- Uploaded files: 5 per session.
- Upload mode: one file at a time.
- User-created folders: 10 per session.
- Total user storage: 20 MB per session.
- Generated document size: 100 KB max.
- Prompt length: 1,500 characters.
- Generate-document instruction length: 2,000 characters.
- Semantic search query length: 500 characters.
- Retrieval topK: 6 chunks.
- Chat history context: recent 8 messages + rolling summary.

## Public upload limits

Allowed:

- `.txt`, `.md`, `.csv`, `.tsv`, `.pdf`, `.docx`

File size:

- `.txt`, `.md`, `.csv`, `.tsv`: 500 KB.
- `.docx`: 1 MB.
- `.pdf`: 2 MB or 10 pages.

Not allowed for public upload in first demo:

- `.xlsx`, `.pptx`, images, audio, video, archive files, executables, unknown binary files.

Controlled mock documents may include all supported formats.

## Mock workspace

Mock story: Orchid Retail Digital Transformation.

Mock folders:

1. Strategy & Rollout
2. Document Operations
3. Finance & Vendors
4. Customer & Support Signals
5. Meeting Evidence
6. Generated Examples

Mock documents are read-only, always available, downloadable, searchable, and attachable.

## Demo guide

The UI must include a guide with sample actions and questions:

- Browse demo folders.
- Attach a folder to chat.
- Ask a sample question.
- Expand attached context.
- Expand references used.
- Generate a document from chat.
- Download the generated file.

Sample questions:

- What is Orchid Retail trying to improve?
- Which documents mention vendor onboarding and invoice tracking?
- Compare rollout risks from the slides and meeting audio.
- What customer pain points relate to document search?
- Create a concise internal briefing from this chat and the references used.

## Clear session and cleanup

Clear session hard-deletes session-created data:

- user uploads.
- generated documents.
- user-created folders.
- chats/messages.
- vectors/chunks for session documents.
- S3 objects under session prefix.

Mock data remains.

Expired sessions are cleaned opportunistically on backend startup, demo bootstrap, or a maintenance endpoint.
