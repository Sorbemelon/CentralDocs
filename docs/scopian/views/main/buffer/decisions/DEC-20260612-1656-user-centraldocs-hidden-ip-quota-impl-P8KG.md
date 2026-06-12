---
id: DEC-20260612-1656-user-centraldocs-hidden-ip-quota-impl-P8KG
type: decision
status: approved
view: main
user: "USER"
agent: "codex"
git: "main@a609a99"
created_at: 2026-06-12T16:56:57+07:00
tags:
  - "spec-sync"
  - "hidden-ip-quota"
  - "data-model"
  - "privacy"
  - "demo-mode"
source_refs:
  - "docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md"
  - "docs/scopian/sources/CENTRALDOCS_DATA_MODEL.md"
  - "docs/scopian/sources/CENTRALDOCS_PUBLIC_PRIVATE_BOUNDARY.md"
user_reply_excerpt: "Next, audit whether all buffer cover current full spec yet. If not update it until compile with the current spec using scopian buffer."
approved_summary: "Hidden IP quota uses a DemoQuotaWindow model and HMAC-SHA256 identity hash, does not store raw IP, defaults to 7-day reset, applies 3x visible limits to uploads/prompts/generated/storage, is not shown in frontend, is not reset by Clear Session, and is enforced before cost-producing actions. Candidate should update demo/data/security docs after user approval."
approval_mode: user_approved_buffer_text
---

# Decision: CentralDocs hidden IP quota implementation details

Hidden IP quota uses a DemoQuotaWindow model and HMAC-SHA256 identity hash, does not store raw IP, defaults to 7-day reset, applies 3x visible limits to uploads/prompts/generated/storage, is not shown in frontend, is not reset by Clear Session, and is enforced before cost-producing actions. Candidate should update demo/data/security docs after user approval.
