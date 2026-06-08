---
name: scopian
description: Evidence-first Scopian workflow for repo planning/building tasks; retrieve scope evidence, decide as agent, log decisions, and ask the user for B/D or insufficient evidence.
---

<!-- SCOPIAN-GUIDE-START agent=claude version=v0.2.5-A -->
# Scopian Evidence-First Workflow

## What Scopian is

Scopian is a local scope-evidence retriever for repository planning and building.

Use it to retrieve selected scope evidence, marker-coded sections, guard evidence statements, and local audit records before changing the repo.

Scopian does not decide scope truth. The agent decides from evidence and logs that decision. The user approves when scope expansion, ambiguity, or a risky B/D marker requires human confirmation.

## When to use Scopian

Use Scopian for repository planning/building tasks, especially when a request may touch:
- product behavior
- files or folders
- generated documents/artifacts
- payments, billing, auth, RBAC, privacy, database, deployment, external integration, destructive data, uploads, or security-sensitive areas
- any task where selected scope docs might allow, limit, block, or require a decision

## When not to use Scopian

Do not use Scopian for:
- casual conversation
- non-repo questions
- general explanations
- translation or summarization that does not plan/build repo work
- small wording answers that do not change or plan the repo
- unrelated shell/help questions
- personal advice outside the repository

## First command: view index

Run this first for non-trivial repo work:

```bash
scopian view index --format=pack
```

Use the pack to learn the source vocabulary. Look for:
- `A` Allowed
- `L` Limit
- `B` Blocked
- `D` Decision-required
- safety summaries
- exact refs for `section show`

Then inspect exact sections:

```bash
scopian section show <ref>
```

Use `section show` repeatedly until you understand the relevant allowed, limit, blocked, and decision evidence.

## Guard query phrasing

Do not pass the noisy raw user prompt by default.

Create a concise scope-check phrase:
- preserve the risky action
- preserve the object/data/system affected
- remove chat noise
- split multiple actions into separate checks
- phrase using the source vocabulary from `view index --format=pack` and `section show`

Bad:

```bash
scopian guard "hey maybe can you prune old stuff to keep it tidy idk"
```

Better:

```bash
scopian guard "Add permanent deletion of member expense history" --format=pack
```

## Guard is an evidence retriever

Run guard after you have a concise scope-check phrase:

```bash
scopian guard "<scope-check phrase>" --format=minimal
```

Use pack when risky, destructive, ambiguous, or near a B/D marker:

```bash
scopian guard "<scope-check phrase>" --format=pack
```

Read `evidence_statement`, not old status/action verdicts.

Evidence statement guide:
- `blocking_evidence_found`: B evidence applies or likely applies. Do not edit. Ask/stop and log.
- `decision_evidence_found`: D evidence applies or likely applies. Ask the user before editing.
- `mixed_evidence_found`: A/L plus B/D evidence is present. Reconcile by meaning; usually ask before editing.
- `no_blocking_evidence_found`: retrieved evidence did not surface direct B/D evidence. This is not proof of in-scope.
- `insufficient_evidence`: selected scope evidence is missing/weak. Ask or inspect more.

Scopian may exit 0 when no blocking evidence is found, but that is not permission. The agent must still decide from evidence.

## Agent decision logging

After reading evidence, log the agent decision when the decision matters:

```bash
scopian decision record agent \
  --task "<concise scope-check phrase>" \
  --evidence-statement <evidence_statement> \
  --decision proceed|ask_user|stop|needs_human \
  --evidence-ref <ref> \
  --rationale "<short rationale from cited evidence>" \
  --agent claude
```

Use `--no-evidence-found` only with `insufficient_evidence`.

Agent decision records are not user approvals:
- agent decision: `decided_by: agent`, `approved_by: none`
- user-approved buffer decision: `approved_by: user`, via `scopian buffer record decision ...`

## User approval and buffer decisions

Ask the user before editing when:
- B evidence may apply
- D evidence may apply
- evidence is mixed or insufficient
- the user asks to expand scope
- the task has multiple meanings

After explicit user approval, record the approved scope decision separately:

```bash
scopian buffer record decision ...
```

Do not fake user approval. Buffer decisions require the user's approved summary and user reply excerpt.

## Glossary bridges

Use glossary only for user-confirmed recurring semantic bridges.

Example:
- user says `prune`
- source says `permanent deletion`

Ask the user if these mean the same scope concept. If confirmed, record and approve a glossary entry. Glossary helps retrieval; it does not approve scope.

## Worked example

User asks: "Can you prune old expense entries to keep the app tidy?"

1. Run:
   ```bash
   scopian view index --format=pack
   ```
2. Inspect B/D refs:
   ```bash
   scopian section show <decision-ref>
   ```
3. Convert the request to source vocabulary:
   ```text
   Add permanent deletion of member expense history
   ```
4. Run:
   ```bash
   scopian guard "Add permanent deletion of member expense history" --format=pack
   ```
5. If guard returns `decision_evidence_found`, ask the user before editing.
6. Log the agent decision:
   ```bash
   scopian decision record agent \
     --task "Add permanent deletion of member expense history" \
     --evidence-statement decision_evidence_found \
     --decision ask_user \
     --evidence-ref <decision-ref> \
     --rationale "Decision-required evidence covers permanent deletion of expense history." \
     --agent claude
   ```
7. If the user approves a new scope decision, record it with `buffer record decision`.

## Never do

- Do not silently expand scope.
- Use the current command surface only.
- Do not treat `no_blocking_evidence_found` as proof of in-scope.
- Do not record user approval unless the user actually approved.
- Do not run Scopian for non-repo/non-build tasks.
<!-- SCOPIAN-GUIDE-END agent=claude -->
