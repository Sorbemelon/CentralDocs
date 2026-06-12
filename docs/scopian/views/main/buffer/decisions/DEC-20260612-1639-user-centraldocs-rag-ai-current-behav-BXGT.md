---
id: DEC-20260612-1639-user-centraldocs-rag-ai-current-behav-BXGT
type: decision
status: approved
view: main
user: "USER"
agent: "codex"
git: "main@a609a99"
created_at: 2026-06-12T16:39:38+07:00
tags:
  - "spec-sync"
  - "rag"
  - "ai"
  - "vector-search"
  - "generated-documents"
source_refs:
  - "docs/scopian/sources/CENTRALDOCS_RAG_AND_AI_DESIGN.md"
  - "docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md"
user_reply_excerpt: "Don't generate a new file directly! Use scopian!"
approved_summary: "Current RAG/AI behavior includes env-driven AI/vector config, Gemini embedding/generation defaults, vector index/path env vars, topKRetrieval and visibleReferences current behavior, selected-document reference backfill, source-level reference dedupe, citation list/range support, optional generated-document instruction with default summary instruction, and safe Markdown answer rendering. Candidate should update existing RAG/AI/API docs after user approval."
approval_mode: user_approved_buffer_text
---

# Decision: CentralDocs RAG AI current behavior

Current RAG/AI behavior includes env-driven AI/vector config, Gemini embedding/generation defaults, vector index/path env vars, topKRetrieval and visibleReferences current behavior, selected-document reference backfill, source-level reference dedupe, citation list/range support, optional generated-document instruction with default summary instruction, and safe Markdown answer rendering. Candidate should update existing RAG/AI/API docs after user approval.
