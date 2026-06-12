---
id: DEC-20260612-1640-user-crosshelix-support-role-for-scop-23KN
type: decision
status: approved
view: main
user: "USER"
agent: "codex"
git: "main@a609a99"
created_at: 2026-06-12T16:40:06+07:00
tags:
  - "tool-feedback"
  - "crosshelix"
  - "scopian"
  - "spec-sync"
  - "guide-improvement"
source_refs:
  - "docs/scopian/sources/CENTRALDOCS_AGENT_PROTOCOL.md"
user_reply_excerpt: "Don't generate a new file directly! Use scopian!"
approved_summary: "CrossHelix is useful for repo evidence and implementation drift discovery, but it should not decide canonical source changes. CrossHelix evidence that conflicts with source docs should feed Scopian Buffer candidates, then user approval, then source sync. Candidate feedback: CrossHelix could provide a compact spec-sync evidence pack and distinguish operational guardcheck risk from docs-scope risk."
approval_mode: user_approved_buffer_text
---

# Decision: CrossHelix support role for Scopian source sync

CrossHelix is useful for repo evidence and implementation drift discovery, but it should not decide canonical source changes. CrossHelix evidence that conflicts with source docs should feed Scopian Buffer candidates, then user approval, then source sync. Candidate feedback: CrossHelix could provide a compact spec-sync evidence pack and distinguish operational guardcheck risk from docs-scope risk.
