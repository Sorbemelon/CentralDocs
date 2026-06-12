---
id: DEC-20260612-1656-user-centraldocs-live-ux-reliability-2RPR
type: decision
status: approved
view: main
user: "USER"
agent: "codex"
git: "main@a609a99"
created_at: 2026-06-12T16:56:48+07:00
tags:
  - "spec-sync"
  - "ux"
  - "live-smoke"
  - "bugfix"
  - "reliability"
source_refs:
  - "docs/scopian/sources/CENTRALDOCS_UX_SPEC.md"
  - "docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md"
  - "docs/scopian/sources/CENTRALDOCS_RAG_AND_AI_DESIGN.md"
user_reply_excerpt: "Next, audit whether all buffer cover current full spec yet. If not update it until compile with the current spec using scopian buffer."
approved_summary: "Current live UX behavior after user testing includes no fake initial chat, no default chat on launch, landing Continue Workspace only for valid active sessions, selected context persists after chat send, provider failures do not create fake failed assistant replies, Markdown answers render safely, generated-document instruction is optional, uploaded/generated docs persist through landing/workspace navigation, and source partial selection is visible in collapsed folders. Candidate should update UX/demo/RAG docs after user approval."
approval_mode: user_approved_buffer_text
---

# Decision: CentralDocs live UX reliability current behavior

Current live UX behavior after user testing includes no fake initial chat, no default chat on launch, landing Continue Workspace only for valid active sessions, selected context persists after chat send, provider failures do not create fake failed assistant replies, Markdown answers render safely, generated-document instruction is optional, uploaded/generated docs persist through landing/workspace navigation, and source partial selection is visible in collapsed folders. Candidate should update UX/demo/RAG docs after user approval.
