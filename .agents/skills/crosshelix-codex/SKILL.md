---
name: crosshelix-codex
description: Use for non-trivial Codex repo work that needs local evidence — precise repo-term retrieval, responsibility and impact review, and safe handoff memory. Skip for trivial one-file edits, formatting-only changes, and non-repo questions.
---
<!-- BEGIN CROSSHELIX MANAGED BLOCK -->
# CrossHelix for Codex

Use this skill when Codex needs local repo-integrity evidence beyond the short `AGENTS.md` pointer. Keep `AGENTS.md` compact; this skill carries the full workflow and is self-contained. CrossHelix is the local, deterministic evidence layer for repo, branch, session, decisions, notes, map links, structure, responsibility, impact, retrieval history, and handoff memory. Treat every result as evidence, not truth.

## Codex-specific use

- Use Codex's own editing, shell, file-read, and test tools for live work; use CrossHelix for local evidence before and after non-trivial changes.
- Keep queries short and symbol-rich so Codex does not spend context on noisy prompt text.
- CrossHelix never runs Codex's tools and never performs Git actions. It does not guarantee correctness, does not replace human review or tests, does not edit source automatically, does not call LLM/cloud/vector services by default, and does not perform Git merge/rebase/switch/commit/push automatically.

## When to use vs skip

Use it for non-trivial repo work: unfamiliar areas, vague or multi-file tasks, responsibility-sensitive changes, impact/test selection, continuation from another session or agent, decisions worth recording, and stale or dirty state. Risky categories (auth, billing, migrations, deployment, schema, cross-agent continuation) are not skip-worthy. Dirty state, many changed files, stale context, or another attached agent escalate prepare mode by task complexity: tiny stays at most `lite`; 10+ changed files go `deep` for medium/risky tasks, else `standard`.

Skip it for non-repo questions, brainstorming, formatting/spelling-only edits, trivial one-line or already-open one-file changes, and tasks where direct reading is cheaper. It is fine to say: "CrossHelix was not needed for this trivial/non-repo task."

## Index freshness first (performance gate)

Retrieval quality depends on a current index, not on speed. Before `prepare` or `search`, check `crosshelix status` or `crosshelix overview`. If the index is missing or `stale_to_head`, or a `reindex` is recommended, run `crosshelix reindex --full` first (when local state writes are allowed) — on an unindexed or stale repo, `prepare`/`search` return weak or empty refs, the most common way usage silently degrades. `reindex` updates local CrossHelix state only, never source. In audit-only or read-only tasks, do not reindex unless permitted; record stale evidence as a limitation. Prefer deterministic evidence (indexed files, symbols, imports, active tags, graph links) over feedback, proposed, stale, or rejected evidence.

## Query discipline

Do not pass the raw user prompt; it carries politeness, hedging, and product words that pollute retrieval. Reduce the task to repo terms first: symbols, classes, functions, commands, config keys, file stems, module paths, or a short subsystem phrase. Short symbol-rich prompts beat long descriptive ones, especially in small or docs-heavy repos.

```text
crosshelix overview
crosshelix search "login auth button handler"
crosshelix prepare "login auth button handler" --agent codex
```

## Light-first workflow

Use the smallest useful path; do not run every command.

```text
status/overview -> reindex --full if stale -> search or prepare -> expand/neighbors/trace as needed -> responsibility map for structure -> impact for changed files -> edit + validate -> guardcheck -> handoff/memory when useful
```

1. `crosshelix status` / `overview` for freshness and repo shape (not a tree or call-graph dump).
2. `crosshelix reindex --full` if status/overview flags a missing or stale index.
3. `crosshelix search` or `crosshelix prepare "<terms>" --agent codex`; prepare is the normal focused-context command.
4. Inspect on demand, then read live files with Codex tools before editing:
   - `expand file:<path>` reads indexed file/symbol content and flags worktree drift.
   - `neighbors file:<path> --limit 5` shows map/retrieval neighbors and decision/note links — not a call graph; for callers, `search` the symbol.
   - `trace file:<path>` shows sessions, decisions, notes, usage, feedback, and graph evidence for a ref.
5. `crosshelix responsibility map` before structure-sensitive changes.
6. `crosshelix impact --files ...` (or `--staged`, `--since`, `--range`) to pick review/test focus.
7. Edit with Codex tools; if you touch files CrossHelix did not surface, say so and inspect them live.
8. Run project validation, then `crosshelix guardcheck` before asking a human to accept meaningful work. Guardcheck is evidence, not sign-off; acceptance rests on tests and human review.

If a brief warns "Likely implementation refs are weak," that is about query match, not proof the refs are wrong: re-run prepare with a shorter symbol-rich prompt or run a concrete `search`, then expand the exact ref. If `expand` shows the task is larger than expected, re-run prepare with the wider scope first. Keep heavy reports (`map report`, full `repair queue`, full `branch audit`, full `trace`, `benchmark auto report`, `integrity report`) for risky or multi-file work, guardcheck warnings, stale/repair investigation, or explicit human asks.

## Freshness and evidence scope

`current_for_head` evidence matches committed HEAD. An uncommitted worktree delta means live files changed after the indexed snapshot; inspect live files before trusting indexed content. A `stale_to_head` warning means the index or graph lags the current commit and must not be ignored when current retrieval matters; run `crosshelix reindex --full`.

## Memory and feedback

Continuity comes from what you record after guardcheck; CrossHelix cannot read private agent transcripts. `prepare` carries `--agent` and is attributed to you, but the inspection commands — `search`, `expand`, `neighbors`, `trace`, `impact`, `responsibility map` — take no `--agent` and do not register as adoption. Recording session, usage, note, decision, and feedback is what makes your work attributable and feeds future ranking. Record only real evidence; do not fabricate notes, decisions, feedback, usage, tests, validation evidence, or handoff evidence.

```text
crosshelix log-usage --agent codex --files "src/services/ticket_service.py,tests/test_ticket_service.py" --note "Used service and test context."
crosshelix session update --agent codex --task "ticket service validation" --status completed --files "src/services/ticket_service.py,tests/test_ticket_service.py" --note "Validated service-layer behavior."
crosshelix note add --agent codex --type handoff --text "Validation complete; review edge-case fixtures next." --files "src/services/ticket_service.py"
crosshelix decision add --state approved --text "Ticket validation remains in the service layer."
```

Use `decision replace decision:<id> --text "..."` when a new approved decision supersedes an older one. For real code/design decisions, ask the human in chat, then record their answer as an approved or rejected decision. Record feedback only when context was genuinely useful, stale, unhelpful, conflicting, too broad, or too narrow; `useful_context` raises that ref's future ranking. Tie feedback to the real ref: for prepare output use `brief:latest` (or `prepare --detail` to copy the exact `brief:...`), and for code use the actual `file:...` or `symbol:...`.

```text
crosshelix feedback add --agent codex --type useful_context --target brief:latest --reason "Brief surfaced the service file that guided the edit."
```

## Safety

Keep secrets private: never put credentials, tokens, private env values, ignored-file contents, or `.crosshelix/` contents into notes, feedback, decisions, prompts, or examples. Do not ask CrossHelix to expand or link ignored or secret-like paths (`.env`, `*.pem`, `*.key`, `id_rsa`, `*secret*`, `*credential*`). Respect `.gitignore` and `.crosshelixignore`. Avoid unnecessary god-modules and structure drift. Ask or confirm when CrossHelix evidence conflicts with user intent or live repo reality.

## Quick reference

```text
crosshelix status
crosshelix overview
crosshelix reindex --full
crosshelix search "ticket_service"
crosshelix prepare "ticket service validation" --agent codex
crosshelix expand file:src/services/ticket_service.py
crosshelix neighbors file:src/services/ticket_service.py --limit 5
crosshelix responsibility map
crosshelix impact --files src/services/ticket_service.py tests/test_ticket_service.py
crosshelix guardcheck
crosshelix handoff
crosshelix session update --agent codex --task "ticket service validation" --status in_progress --files "src/services/ticket_service.py" --note "Reviewing validation flow."
crosshelix log-usage --agent codex --files "src/services/ticket_service.py" --note "Used service context."
crosshelix feedback add --agent codex --type useful_context --target brief:latest --reason "Brief surfaced the service context."
```

The installed CrossHelix CLI is the source of truth for available commands.
<!-- END CROSSHELIX MANAGED BLOCK -->
