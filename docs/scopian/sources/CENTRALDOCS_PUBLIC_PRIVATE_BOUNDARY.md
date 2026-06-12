# CentralDocs Public/Private Repo Boundary

## Public and tracked project areas

Expected public project areas:

- `frontend/`
- `backend/`
- `backend/mock-data/`
- `docs/scopian/sources/`
- `docs/scopian/views/` generated Scopian projections when refreshed by Scopian.
- `README.md`
- `.gitignore`
- `.crosshelixignore`
- safe `.env.example` files.

## Private/local and ignored areas

Must remain private or ignored:

- `_reference/`
- `docs/scopian/private/`
- private progress reports.
- private tool-feedback reports.
- real `backend/.env`
- real `frontend/.env`
- local upload/cache/log/runtime artifacts.
- provider or deployment credentials.

## Secret handling

Source docs, reports intended for public use, frontend UI, and API DTOs must not expose:

- MongoDB connection strings.
- AWS access keys or secret keys.
- Gemini API keys.
- hidden IP hash secret values.
- S3 object keys.
- raw signed URLs outside the explicit download-url API response.
- raw embeddings.
- hidden prompts or provider request bodies.
- local absolute paths.

Environment variable names may be documented when needed. Real values must not be copied into source docs.

## Root context files

Root `PRODUCT.md` and `DESIGN.md` may exist as local design/context files. Their approved product and design guidance can be merged into existing Scopian source docs, but the root files themselves are not canonical Scopian source specs unless the user later decides to track or promote them. Do not use them to bypass `docs/scopian/sources/` or Scopian Buffer.

## Registry and source boundary

`docs/scopian/source_registry.yml` is a scope boundary. Agents must not edit it or register new source files without explicit user approval.

When current implementation has context that is not represented in source docs, record a Scopian Buffer decision and ask the user how to merge it.

## Public documentation posture

Public docs should describe the approved product, architecture, and safety model. They should not include private progress-report paths, long build logs, temporary failed approaches, raw local machine paths, or secret-like values.
