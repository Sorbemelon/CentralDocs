# CentralDocs Agent Protocol

## Working style

CentralDocs is built through bounded implementation and audit rounds. Agents must follow the active phase boundaries, preserve user-approved scope, inspect the repo before changing files, and report validation results clearly.

Codex is the active implementation and audit agent going forward unless the user says otherwise.

## Scopian workflow

Scopian is required for scope-sensitive source-spec work.

Canonical source docs live in:

```text
docs/scopian/sources/
```

Scopian Buffer discipline:

1. New, additional, missing, or deviating context goes to Scopian Buffer first.
2. User approval comes before canonical source edits.
3. Source edits happen only in existing registered source docs unless the user explicitly approves a new source.
4. Generated views are refreshed after source edits.
5. Buffer records are resolved only through a supported Scopian workflow.

Guard output is evidence, not edit permission. Agents must not treat guard success as approval to broaden scope.

New source files and source registry changes require explicit user approval. Do not create or register new Scopian source files from implementation evidence alone.

## CrossHelix role

CrossHelix may be used for repo evidence, implementation mapping, changed-file awareness, and drift discovery. CrossHelix does not decide canonical source changes. If CrossHelix evidence conflicts with source docs, record the drift through Scopian Buffer and ask the user before source edits.

## AutumData reference

AutumData may be inspected for visual/UX ideas and behavior clues. It is not a source of truth. CentralDocs source specs and current approved implementation override AutumData.

## Package and dependency boundaries

- Backend dependencies stay inside `backend/`.
- Frontend dependencies stay inside `frontend/`.
- Do not create a root package manifest.
- Do not install dependencies at the repo root.
- Do not run automated dependency-fix commands unless the user explicitly asks.

## Required agent behavior

- Keep public/private boundaries intact.
- Do not expose secrets.
- Do not create real environment files.
- Do not commit private reports or `_reference/`.
- Preserve one-file public upload.
- Preserve public upload restrictions.
- Preserve mock read-only behavior.
- Preserve selected-context snapshots for chat.
- Preserve references under assistant answers.
- Preserve generated documents as downloadable/indexable documents.
- Preserve local/offline fallback while keeping it visibly distinct from live success.
- Do not add separate workspace feature routes.
- Do not add PDF/DOCX export, fixed templates, or slash-command behavior.

## Validation expectations

For implementation or source-spec phases, use the validation set requested by the active phase. Common checks include:

- backend `npm.cmd test`.
- frontend `npm.cmd run build`.
- `git diff --check`.
- `git status --short --untracked-files=all`.
- relevant route, scope, secret, and stale-doc scans.
- private progress report under `docs/scopian/private/progress/` when the phase asks for one.

## Reporting

Reports should separate:

- files changed.
- commands run.
- pass/fail results.
- known limits.
- skipped or blocked items.
- whether backend/frontend/runtime files remained untouched when the phase required docs-only work.
