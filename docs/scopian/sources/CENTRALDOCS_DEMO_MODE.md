# CentralDocs Demo Mode

## Demo philosophy

CentralDocs is demo-first and does not require auth. A visitor can launch or continue an anonymous demo session, inspect seeded mock documents, create session-owned data, ask grounded questions, generate documents, and clear the workspace.

```text
Open app -> warm backend -> create/resume session -> bootstrap mock workspace -> use sources/search/chat/generation/downloads -> clear session
```

## Visible limits

Visible session limits are shown through the existing Usage display.

- Demo session/data lifetime: 3 days by default.
- Saved chat sessions: 5 active chats per session.
- AI prompts: 10 per session.
- Generated documents: 3 per session.
- Uploaded files: 5 per session.
- Upload mode: one file at a time.
- User-created folders: 10 per session.
- Total user storage: 20 MB per session.
- Generated document size: 100 KB max.
- Prompt length: 1,500 characters.
- Generate-document instruction length: 2,000 characters when provided.
- Semantic search query length: 500 characters.
- RAG retrieval: 15 chunks.
- Answer references shown: up to 10.
- Chat history context: recent messages plus rolling summary when available.

## Public upload limits

Allowed public upload types:

- `.txt`
- `.md`
- `.csv`
- `.tsv`
- `.pdf`
- `.docx`

File size:

- `.txt`, `.md`, `.csv`, `.tsv`: 500 KB.
- `.docx`: 1 MB.
- `.pdf`: 2 MB or configured page cap.

Not allowed for public upload:

- `.xlsx`
- `.pptx`
- images
- audio
- video
- archives
- executables
- unknown binary files

Controlled seeded mock documents may include richer formats and media.

## Hidden IP-aware quota

Hidden IP-aware quota is server-side only and is not displayed in the frontend.

Defaults:

- `DEMO_SESSION_TTL_DAYS=3`
- `DEMO_QUOTA_WINDOW_DAYS=7`
- `DEMO_IP_QUOTA_ENABLED=true` in production unless explicitly configured otherwise.
- `DEMO_IP_QUOTA_MULTIPLIER=3`
- `DEMO_IP_HASH_SECRET` is required in production when hidden quota is enabled.

Hidden quota applies to:

- uploads.
- AI prompts.
- generated documents.
- storage bytes.

Hidden limits are 3x the visible session limits. The hidden quota window resets after 7 days by default. Raw IP addresses are not stored; only an HMAC-SHA256 identity hash is persisted.

## Clear Session policy

Clear Session cleans session-created data:

- uploaded documents.
- generated documents.
- user-created folders.
- chats and messages.
- chunks for session-created documents.
- session-owned S3 objects under `demo-sessions/<sessionId>/`.

Mock data remains.

Production behavior:

- Clear Session does not reset visible usage.
- Clear Session does not reset hidden IP quota.
- The clear response includes `clearPolicy.usageReset=false`.
- The frontend returns the user to the landing page and keeps usage bound to the backend response.

Development/test behavior:

- Clear Session may reset visible usage when `DEMO_CLEAR_RESETS_USAGE` resolves to true.
- Hidden IP quota is disabled by default in test unless explicitly enabled.

## Session expiry and cleanup

Session-created data expires after 3 days by default. Expired cleanup removes session-owned data while preserving seeded mock data and `mock/` S3 objects.

Hidden IP quota resets after the quota window, default 7 days, independently from session data expiry.

Cleanup is opportunistic unless a deployment adds a scheduled trigger. Current opportunistic triggers include backend startup and demo session/bootstrap paths where the backend invokes cleanup.

## Mock workspace

The mock story is Orchid Retail Digital Transformation. It is a fictional demo corpus only, not CentralDocs product identity.

Mock documents are read-only, always available after seeding, searchable, attachable, previewable, and downloadable. Clear Session and expired session cleanup must preserve mock metadata, chunks, and S3 objects.

## Chat and fallback rules

Live backend mode should not show fake initial chat history. If no chat exists, the workspace shows an empty chat state with a New Chat action.

Offline/local fallback can show an empty local chat shell and sample questions, but it should not look like persisted live chat history and should not produce fake successful answers.
