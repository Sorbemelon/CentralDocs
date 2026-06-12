# AutumData Reference Boundary

AutumData is a legacy reference only. CentralDocs is a clean rebuild with its own specs and implementation.

## Allowed uses

Agents may inspect AutumData for:

- visual inspiration.
- compact source/chat workspace ideas.
- file/folder interaction lessons.
- RAG flow ideas.
- useful implementation clues.
- examples of what to improve or avoid.

## Not allowed

Agents must not:

- treat AutumData as current CentralDocs architecture.
- copy old structure blindly.
- migrate old code wholesale.
- let AutumData override CentralDocs specs.
- index `_reference/` with CrossHelix or Scopian.
- copy AutumData source into CentralDocs source docs as if it were canonical.

## Local layout

Old repos may exist only under:

```text
_reference/
```

`_reference/` must stay gitignored and crosshelixignored.

## Current relevance

AutumData can be useful for understanding a compact source/chat workspace pattern, but CentralDocs final behavior controls all decisions: the single `/workspace` route, selected context, references under answers, generated documents, quota policy, storage design, and public/private boundary.
