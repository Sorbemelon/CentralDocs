# CentralDocs UX Specification

## Visual direction

CentralDocs should feel like a polished document workspace, not a generic chatbot. Use a similar palette spirit to AutumData, but make it more professional: deep document blue, teal/emerald accents, soft slate surfaces, clear status badges, and restrained gradients.

Default theme is light. Dark mode is supported through a toggle button.

## Landing page

The landing page explains the project before entering the demo.

Sections:

1. Top navigation: logo, Project, Architecture, Demo Guide, Launch Demo.
2. Hero: project name, one-line promise, CTA, backend status chip.
3. Problem/Solution: scattered documents become searchable AI knowledge.
4. Core capabilities: document management, semantic search, selected-document chat, saved sessions, references, generated docs, downloads.
5. Simple architecture diagram: Vercel, Render, MongoDB, S3, Gemini.
6. Demo guide and sample questions.
7. Demo limits.
8. Tech stack.
9. CTA footer.

Hero copy:

> CentralDocs is a demo-first AI document workspace for digital transformation. Upload, organize, search, and chat with selected documents. CentralDocs keeps answers grounded with source references and lets you turn useful conversations into downloadable documents.

## Workspace layout

- Left sidebar: Dashboard, Documents, Semantic Search, Chat, Generated Documents, Demo Guide.
- Top bar: backend status, session expiry, usage counters, theme toggle.
- Main content: current page.
- Right panel where useful: demo guide/status/context.

## Documents UX

The Documents page has a folder tree, document list, upload card, details drawer, and Trash filter.

Document row/card fields:

- File icon.
- Title.
- File type badge.
- Source badge: Mock, Uploaded, Generated.
- Lifecycle/status badge: Ready, Processing, Failed, Trashed.
- Folder.
- Chunk count.
- Attach toggle.
- Preview button.
- Download button.

Folder actions:

- Create folder.
- Rename user folder.
- Soft-delete user folder.
- Attach folder to chat.
- Show document count.

Mock folders/documents are read-only but downloadable and attachable.

Trash is a filter inside Documents, not a separate full page.

## Upload UX

Upload one file at a time. Validate file type and size before enabling Upload. Backend validates again.

Allowed public upload types:

- `.txt`, `.md`, `.csv`, `.tsv`, `.pdf`, `.docx`

Upload status steps:

1. Uploading file.
2. Extracting text.
3. Optimizing text.
4. Chunking.
5. Embedding.
6. Ready for search and chat.

Show success/fail status cards.

## Semantic Search UX

Search by meaning, not exact keyword only.

Controls:

- Query box.
- Scope selector: all demo docs, selected folders, selected documents, uploaded only, generated only.
- Search button.

Results show document title, source locator, excerpt, score, and actions: open, attach, ask in chat.

## Chat UX

A chat session has persistent selected documents/folders. The selection does not clear after sending a prompt.

Each user prompt saves a snapshot:

- attached folders.
- directly attached documents.
- resolved documents from folders at that time.

User prompt panel:

```text
▸ Attached context used: 2 folders, 7 documents
```

Assistant answer panel:

```text
▸ References used: 4
```

References are collapsed by default and show document title, section/page/slide/sheet/row/timestamp where available, excerpt preview, similarity score, and used-for note.

## Generate Document UX

Generated documents are created from a dedicated Generate Document button, not by typing a command into chat.

Modal fields:

- Free-form instruction.
- Filename, default `.md`.
- Include references toggle.
- Include current selected document context toggle.
- Source preview.

Status steps:

1. Preparing chat context.
2. Retrieving supporting references.
3. Generating document.
4. Saving to S3.
5. Indexing generated document.
6. Ready to preview/download/attach.

No fixed document type dropdown. The user describes the format/requirements in natural language.
