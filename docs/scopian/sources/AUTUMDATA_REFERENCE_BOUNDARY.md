# AutumData Reference Boundary

AutumData is a legacy reference only. CentralDocs is a clean rebuild.

## Allowed uses

Agents may inspect AutumData for:

- visual inspiration.
- old file/folder behavior.
- old RAG flow ideas.
- useful implementation clues.
- what to improve or avoid.

## Not allowed

Agents must not:

- treat AutumData as current architecture.
- copy old messy structure blindly.
- migrate old code wholesale.
- override CentralDocs specs with AutumData behavior.
- index `_reference/` with CrossHelix or Scopian.

## Local layout

Place old repos here only:

```text
_reference/autumdata-frontend/
_reference/autumdata-backend/
```

`_reference/` must be gitignored and crosshelixignored.
