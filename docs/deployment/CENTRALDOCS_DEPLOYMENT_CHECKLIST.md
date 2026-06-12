# CentralDocs Deployment Checklist

This checklist prepares CentralDocs for hosted deployment. It is public-safe: use placeholders only, keep secrets in provider dashboards, and do not commit real environment files.

## Target Shape

| Target | Root / owner | Required setup |
| --- | --- | --- |
| Render web service | `backend/` | Node runtime, `npm install`, `npm run start`, environment variables in Render. |
| Vercel project | `frontend/` | Vite build, `npm run build`, output directory `dist`, public API base URL. |
| MongoDB Atlas | external | `centraldocs` database, Mongoose collections, Atlas Vector Search index. |
| AWS S3 | external | Private bucket for mock, uploaded, and generated files. |
| Gemini | backend only | API keys and model settings configured in Render, never in frontend env. |

## 1. Render Backend

Create a Render web service from the repository with:

- Root directory: `backend/`
- Build command: `npm install`
- Start command: `npm run start`
- Health check path: `/api/health`
- Production environment: `NODE_ENV=production`

The backend reads `process.env.PORT` through `backend/src/config/env.js` and `backend/src/server.js`. Render should provide the port; do not hardcode a public production port.

Required Render variables:

```text
NODE_ENV
PORT
CLIENT_ORIGINS
MONGODB_URI
MONGODB_DATABASE_NAME
MONGODB_VECTOR_INDEX_NAME
MONGODB_VECTOR_PATH
AWS_REGION
AWS_S3_BUCKET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AI_PROVIDER
GEMINI_API_KEY_1
GEMINI_API_KEY_2
GEMINI_API_KEY_3
GEMINI_EMBEDDING_MODEL
GEMINI_EMBEDDING_DIMENSIONS
GEMINI_GENERATION_PRIMARY_MODEL
GEMINI_GENERATION_FALLBACK_MODEL_1
GEMINI_GENERATION_FALLBACK_MODEL_2
DEMO_CLEAR_RESETS_USAGE
DEMO_SESSION_TTL_DAYS
DEMO_QUOTA_WINDOW_DAYS
DEMO_IP_QUOTA_ENABLED
DEMO_IP_QUOTA_MULTIPLIER
DEMO_IP_HASH_SECRET
```

Use `backend/.env.example` as the placeholder reference. Put the deployed Vercel origin in `CLIENT_ORIGINS`, for example `https://<vercel-project>.vercel.app`.

No `render.yaml` is required for the current setup. Manual dashboard configuration keeps secrets out of the repository and is sufficient for the first hosted demo.

## 2. Vercel Frontend

Create a Vercel project from the repository with:

- Root directory: `frontend/`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Required Vercel variable:

```text
VITE_API_BASE_URL=https://<render-backend-url>/api
```

Optional display variable:

```text
VITE_APP_NAME=CentralDocs
```

Only `VITE_` variables are intended for the frontend. Do not configure MongoDB, AWS, Gemini, or backend-only demo guardrail secrets in Vercel.

## 3. MongoDB Atlas

Configure MongoDB Atlas before running the live demo:

- Create or select the `centraldocs` database.
- Ensure the backend database user can read and write the app collections.
- Configure Atlas network access so the Render service can connect.
- Include `/centraldocs` in the MongoDB URI path before query parameters.
- Create the Atlas Vector Search index externally in Atlas.

Vector Search settings:

| Setting | Default |
| --- | --- |
| Index name | `document_chunks_vector_index` |
| Vector path | `embedding` |
| Dimensions | `768` |
| Similarity | `cosine` |

Semantic search and RAG chat can fail while the Atlas Vector Search index is missing or still building. Wait for the index to become queryable before final smoke testing.

## 4. AWS S3

Create a private S3 bucket and configure the backend with bucket name, region, and credentials.

Required prefixes:

```text
mock/
demo-sessions/<sessionId>/uploads/
demo-sessions/<sessionId>/generated/
```

Required IAM actions for the backend role/user:

```text
s3:PutObject
s3:GetObject
s3:DeleteObject
s3:ListBucket
```

Keep the bucket private. The app downloads files through backend-authorized presigned URL responses, so no public bucket policy is required.

If browser download/open behavior needs S3 CORS, limit CORS origins to the deployed frontend origin and local development origins used by the project.

## 5. Gemini

Configure Gemini keys only in Render backend environment variables:

- `GEMINI_API_KEY_1`
- `GEMINI_API_KEY_2`
- `GEMINI_API_KEY_3`

Configure the provider/model variables from `backend/.env.example`. The frontend must never receive Gemini keys. Free-tier and rate-limit behavior should be treated as an expected demo constraint and verified during smoke testing.

## 6. Demo Operations

After Render environment variables are set and the backend can connect to MongoDB, S3, and Gemini, run setup scripts from `backend/`:

```bash
npm run seed:mock
npm run index:mock
npm run embed:mock-media
```

Recommended order:

1. Deploy backend.
2. Verify `/api/health`, `/api/health/warm`, and `/api/health/dependencies`.
3. Seed mock workspace.
4. Index mock text documents.
5. Embed mock media if the demo needs media references.
6. Deploy frontend with the Render API URL.
7. Add the Vercel URL to backend `CLIENT_ORIGINS`.
8. Redeploy backend after origin changes if needed.

Clear Session should remove session-created workspace data and preserve seeded mock data. In production, clear-session copy must not imply that public demo usage is reset.

## 7. Hosted Smoke Checklist

Run this after both services are deployed:

- `GET /api/health` returns ok.
- `GET /api/health/warm` returns awake.
- `GET /api/health/dependencies` shows MongoDB, S3, Gemini, vector metadata, and safe demo guardrail status without secrets.
- Landing page loads from Vercel.
- Launch or continue demo enters `/workspace`.
- Seeded mock folders/documents appear.
- Source selection updates Current Selected Context.
- Preview opens a mock document with multi-line content.
- Semantic search returns results for a selected context.
- RAG chat returns a real assistant answer with references.
- Generated document with empty instruction creates `summary.md` or a numbered variant.
- Generated document appears in Sources and Generated tab.
- Generated document download works.
- One small supported upload works and becomes previewable/downloadable.
- Unsupported public upload types are rejected before upload.
- Clear Session returns to landing, clears session-created data, and keeps mock data.

Start the hosted smoke from a fresh or cleared demo session to avoid confusing quota exhaustion with deployment failure.

## 8. Public Safety Checks

Before sharing hosted URLs:

- Confirm no real `.env` file is tracked.
- Confirm no root `package.json` exists.
- Confirm frontend env contains only `VITE_` values.
- Confirm `/api/health/dependencies` does not expose secrets, database URIs, S3 internals, or provider internals.
- Confirm README links still say "Coming soon" until the hosted URLs are ready.
- Confirm public upload remains limited to document/text formats.
