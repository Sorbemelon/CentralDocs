# CentralDocs Agent Protocol

## Working style

This project is built through controlled implementation rounds in ChatGPT. The chat is the control room. Agents should implement bounded changes, report results, and wait for review before moving to the next tranche.

## Scopian

Use `docs/scopian/sources/` as the source of truth. Register these docs before implementation. Do not use private prompts/progress as scope sources.

## CrossHelix

Use CrossHelix to preserve repo integrity, map relationships, and reduce accidental drift. Exclude `_reference/`, private Scopian files, prompts, progress logs, generated caches, and local runtime artifacts.

## AutumData reference

AutumData may be inspected for UI ideas, behavior clues, or previous implementation lessons. It is not the source of truth. CentralDocs specs override AutumData.

## Agent division

Claude Code:

- frontend and UI.
- landing page.
- dashboard/documents/search/chat/generated-docs UI.
- visual polish.
- AutumData UI reference.

Codex:

- backend.
- API.
- MongoDB models.
- S3 storage.
- Gemini AI layer.
- RAG retrieval.
- chat sessions.
- generated documents.
- tests/integration.
- can inspect AutumData when useful.

## Required behavior for agents

- Keep public/private boundary intact.
- Do not commit secrets.
- Do not push `_reference/`.
- Do not remove demo limits.
- Do not make mock documents deletable.
- Keep soft delete behavior for user files/folders.
- Preserve per-message attached context snapshots.
- Preserve references-used metadata for answers.
- Keep generated documents as first-class downloadable/indexable documents.
- Use light theme default and dark-capable theme toggle.
