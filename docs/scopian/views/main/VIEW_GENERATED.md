---
generated_by: scopian
generator_schema: v0.2-B
view: main
generated_at: 2026-06-12T20:40:33+07:00
non_canonical: true
generated_mode: single
canonical_inputs:
  - VIEW.md
  - selected Scope Sources
  - approved Scope Buffer
  - context.yml
  - source_registry.yml
input_hashes:
  view: sha256:6571b0847051
  sources: sha256:cf123ad6f8e4
  buffer: sha256:4590c6624ff8
  context: sha256:5ef45bc1a5d7
  registry: sha256:ece12fe80b14
---

# Generated Scope View

## Non-Canonical Notice

This file is generated and non-canonical.
Canonical scope comes from VIEW.md, selected Scope Sources, approved Scope Buffer records, context.yml, and source_registry.yml.
Regenerate with `scopian view refresh` after source or buffer changes.

## Active Scope View

- view: main
- view_path: docs/scopian/views/main/VIEW.md
- generated_at: 2026-06-12T20:40:33+07:00

## Selected Sources

- docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md (sha256:257347d3cfafecd0b29375bbf14058995253f1ff9cb84ae3396894ac68a53deb)
- docs/scopian/sources/CENTRALDOCS_AGENT_PROTOCOL.md (sha256:ff1103a716313cb9d1d891ba7025bfddd066d9647f50b1f014d71bec45fa18d1)
- docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md (sha256:7946ba91ea32b6da98bf48f3ce824dbc2dcbc4ec6fc9291b4e42ceeab612b05d)
- docs/scopian/sources/CENTRALDOCS_ARCHITECTURE.md (sha256:4e451e6f0f741afbc5a4e68440d5eb2e8916d19bd6e74475f517e68c3e77c1a9)
- docs/scopian/sources/CENTRALDOCS_DATA_MODEL.md (sha256:971551fcdebb2eb4189a80215d73113e93e3cd30683ccad295a6d11606b365d9)
- docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md (sha256:46a8c50f4e5df4991be3a2ca2e1fd4b2cba880433780fba368202317bb06b080)
- docs/scopian/sources/CENTRALDOCS_MOCK_DATA_SPEC.md (sha256:5cf902dcbd135e9729fdb49a8454721d1c3c88a3a1ee62ffbc642d994992d14c)
- docs/scopian/sources/CENTRALDOCS_PRODUCT_SCOPE.md (sha256:c5e81aed187d201b4f0f510cb25dbebaea57a830251c9c3a7219fe6137c1fa41)
- docs/scopian/sources/CENTRALDOCS_PUBLIC_PRIVATE_BOUNDARY.md (sha256:77dc5905356e3d3702fdc5a2b6a2f914ed89cf330fd46bf964e1c05a4e4679c3)
- docs/scopian/sources/CENTRALDOCS_RAG_AND_AI_DESIGN.md (sha256:aadcbe9cbb36a1bff7e576dee1f67739b37a2c715709c0785d605cbff1cd4d43)
- docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md (sha256:f4c4df6afa37da662397c95681d86db2bf13dd1b03cab011221d0f296180295f)
- docs/scopian/sources/CENTRALDOCS_UX_SPEC.md (sha256:ea34a4a816ca8649b98270688e8dae5cfc162170d5ae725861b5777e23f695d4)

## Approved Buffer Summary

- 2026-06-12T16:39:14+07:00 DEC-20260612-1639-user-centraldocs-visual-design-source-RPTZ: CentralDocs visual design direction is current implementation context, but there is no registered visual-design source. Do not add or re ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-visual-design-source-RPTZ.md)
- 2026-06-12T16:39:21+07:00 DEC-20260612-1639-user-centraldocs-ux-implementation-dr-EC2W: Current CentralDocs UX differs from early source specs: landing is compact and brand-forward, workspace is a single /workspace route, So ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-ux-implementation-dr-EC2W.md)
- 2026-06-12T16:39:28+07:00 DEC-20260612-1639-user-centraldocs-demo-quota-cleanup-p-3D2C: Current demo mode includes 3-day visible session/data expiry, 7-day hidden IP quota reset, hidden IP quota at 3x visible limits for uplo ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-demo-quota-cleanup-p-3D2C.md)
- 2026-06-12T16:39:38+07:00 DEC-20260612-1639-user-centraldocs-rag-ai-current-behav-BXGT: Current RAG/AI behavior includes env-driven AI/vector config, Gemini embedding/generation defaults, vector index/path env vars, topKRetr ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-rag-ai-current-behav-BXGT.md)
- 2026-06-12T16:39:45+07:00 DEC-20260612-1639-user-centraldocs-data-model-storage-c-M4SD: Current implementation includes DemoQuotaWindow hidden quota model, HMAC identity hash without raw IP storage, Mongoose models, Document ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-data-model-storage-c-M4SD.md)
- 2026-06-12T16:39:52+07:00 DEC-20260612-1639-user-centraldocs-agent-protocol-publi-9M2D: Current workflow uses Codex going forward, Scopian for scope/spec decisions, CrossHelix as optional implementation evidence, backend/fro ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-agent-protocol-publi-9M2D.md)
- 2026-06-12T16:39:59+07:00 DEC-20260612-1639-user-scopian-scope-control-guide-impr-B4J7: Scopian was previously bypassed because Codex created private Markdown planning files directly instead of using Scopian Buffer. Guide im ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-scopian-scope-control-guide-impr-B4J7.md)
- 2026-06-12T16:40:06+07:00 DEC-20260612-1640-user-crosshelix-support-role-for-scop-23KN: CrossHelix is useful for repo evidence and implementation drift discovery, but it should not decide canonical source changes. CrossHelix ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1640-user-crosshelix-support-role-for-scop-23KN.md)
- 2026-06-12T16:56:25+07:00 DEC-20260612-1656-user-centraldocs-product-scope-curren-PEMN: CentralDocs current product scope is a demo-first AI document workspace portfolio project with no normal auth, a landing page plus singl ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-product-scope-curren-PEMN.md)
- 2026-06-12T16:56:32+07:00 DEC-20260612-1656-user-centraldocs-api-contract-current-ZR3R: Current CentralDocs API contract includes x-demo-session-id, health/dependency routes, demo session/bootstrap/guide/clear with clearPoli ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-api-contract-current-ZR3R.md)
- 2026-06-12T16:56:39+07:00 DEC-20260612-1656-user-centraldocs-deployment-readiness-GESG: Current CentralDocs deployment readiness includes backend Render deployment, frontend Vercel deployment, MongoDB Atlas with Vector Searc ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-deployment-readiness-GESG.md)
- 2026-06-12T16:56:48+07:00 DEC-20260612-1656-user-centraldocs-live-ux-reliability-2RPR: Current live UX behavior after user testing includes no fake initial chat, no default chat on launch, landing Continue Workspace only fo ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-live-ux-reliability-2RPR.md)
- 2026-06-12T16:56:57+07:00 DEC-20260612-1656-user-centraldocs-hidden-ip-quota-impl-P8KG: Hidden IP quota uses a DemoQuotaWindow model and HMAC-SHA256 identity hash, does not store raw IP, defaults to 7-day reset, applies 3x v ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-hidden-ip-quota-impl-P8KG.md)
- 2026-06-12T16:57:04+07:00 DEC-20260612-1657-user-centraldocs-real-live-smoke-veri-SNSN: Real local live smoke verified MongoDB Atlas, S3, Gemini, mock seed/index/direct media embedding, semantic search, RAG chat, generated d ... (docs/scopian/views/main/buffer/decisions/DEC-20260612-1657-user-centraldocs-real-live-smoke-veri-SNSN.md)

## Scope Checklist

| Item ID | Scope Signal | Scope Item | Refs | Flags | Implementation Evidence |
|---|---|---|---|---|---|
| ITEM-likely-in-scope-allowed-uses-visual-inspiration-66375d9e | likely_in_scope | Allowed uses: visual inspiration.; compact source/chat workspace ideas.; file/folder interaction lessons.; RAG flow ideas. | docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md#allowed-uses | none | not_checked_in_generated_view |
| ITEM-likely-in-scope-centraldocs-current-product-scop-9fd60b99 | likely_in_scope | CentralDocs current product scope is a demo-first AI document workspace portfolio project with no normal auth, a landing page plus singl ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-product-scope-curren-PEMN.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-crosshelix-is-useful-for-repo-ev-47777d7b | likely_in_scope | CrossHelix is useful for repo evidence and implementation drift discovery, but it should not decide canonical source changes. CrossHelix ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1640-user-crosshelix-support-role-for-scop-23KN.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-current-centraldocs-api-contract-25b99a0f | likely_in_scope | Current CentralDocs API contract includes x-demo-session-id, health/dependency routes, demo session/bootstrap/guide/clear with clearPoli ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-api-contract-current-ZR3R.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-current-centraldocs-deployment-r-9001699a | likely_in_scope | Current CentralDocs deployment readiness includes backend Render deployment, frontend Vercel deployment, MongoDB Atlas with Vector Searc ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-deployment-readiness-GESG.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-current-demo-mode-includes-3-day-03535ee7 | likely_in_scope | Current demo mode includes 3-day visible session/data expiry, 7-day hidden IP quota reset, hidden IP quota at 3x visible limits for uplo ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-demo-quota-cleanup-p-3D2C.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-current-implementation-includes-39ef3e7d | likely_in_scope | Current implementation includes DemoQuotaWindow hidden quota model, HMAC identity hash without raw IP storage, Mongoose models, Document ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-data-model-storage-c-M4SD.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-current-rag-ai-behavior-includes-f4096269 | likely_in_scope | Current RAG/AI behavior includes env-driven AI/vector config, Gemini embedding/generation defaults, vector index/path env vars, topKRetr ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-rag-ai-current-behav-BXGT.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-current-workflow-uses-codex-goin-fc705fc3 | likely_in_scope | Current workflow uses Codex going forward, Scopian for scope/spec decisions, CrossHelix as optional implementation evidence, backend/fro ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-agent-protocol-publi-9M2D.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-hidden-ip-quota-uses-a-demoquota-d39c91b8 | likely_in_scope | Hidden IP quota uses a DemoQuotaWindow model and HMAC-SHA256 identity hash, does not store raw IP, defaults to 7-day reset, applies 3x v ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-hidden-ip-quota-impl-P8KG.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-mongodb-atlas-and-vector-search-d6992f2c | likely_in_scope | MongoDB Atlas and Vector Search: `MONGODB_VECTOR_INDEX_NAME`; `MONGODB_VECTOR_PATH`; `GEMINI_EMBEDDING_DIMENSIONS` | docs/scopian/sources/CENTRALDOCS_ARCHITECTURE.md#mongodb-atlas-and-vector-search | none | not_checked_in_generated_view |
| ITEM-likely-in-scope-public-upload-limits-txt-md-csv-76f21c23 | likely_in_scope | Public upload limits: `.txt`; `.md`; `.csv`; `.tsv` | docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md#public-upload-limits | none | not_checked_in_generated_view |
| ITEM-likely-in-scope-real-local-live-smoke-verified-m-5b2a2ccf | likely_in_scope | Real local live smoke verified MongoDB Atlas, S3, Gemini, mock seed/index/direct media embedding, semantic search, RAG chat, generated d ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1657-user-centraldocs-real-live-smoke-veri-SNSN.md | approved_buffer | not_checked_in_generated_view |
| ITEM-likely-in-scope-scopian-was-previously-bypassed-2cba12f5 | likely_in_scope | Scopian was previously bypassed because Codex created private Markdown planning files directly instead of using Scopian Buffer. Guide im ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-scopian-scope-control-guide-impr-B4J7.md | approved_buffer | not_checked_in_generated_view |
| ITEM-allowed-with-limits-accessibility-icon-only-buttons-444e618e | allowed_with_limits | Accessibility: Icon-only buttons need accessible labels.; Hover-only actions should remain discoverable enough for keyboard or pointer users.; Text contrast ... | docs/scopian/sources/CENTRALDOCS_UX_SPEC.md#accessibility | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-audience-e5cae0fe | allowed_with_limits | Audience | docs/scopian/sources/CENTRALDOCS_PRODUCT_SCOPE.md#audience | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-autumdata-reference-boundary-84fbdb6e | allowed_with_limits | AutumData Reference Boundary | docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md#autumdata-reference-boundary | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-backend-runtime-78de1803 | allowed_with_limits | Backend runtime | docs/scopian/sources/CENTRALDOCS_ARCHITECTURE.md#backend-runtime | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-centraldocs-visual-design-direct-3a686d1f | allowed_with_limits | CentralDocs visual design direction is current implementation context, but there is no registered visual-design source. Do not add or re ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-visual-design-source-RPTZ.md | approved_buffer | not_checked_in_generated_view |
| ITEM-allowed-with-limits-chat-sessions-get-api-chats-list-434db629 | allowed_with_limits | Chat sessions: `GET /api/chats` - list saved chats.; `POST /api/chats` - create chat with a unique title.; `GET /api/chats/:chatId` - get chat detail with m ... | docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md#chat-sessions | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-current-centraldocs-ux-differs-f-2fe18b40 | allowed_with_limits | Current CentralDocs UX differs from early source specs: landing is compact and brand-forward, workspace is a single /workspace route, So ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1639-user-centraldocs-ux-implementation-dr-EC2W.md | approved_buffer | not_checked_in_generated_view |
| ITEM-allowed-with-limits-current-live-ux-behavior-after-u-2055cbb1 | allowed_with_limits | Current live UX behavior after user testing includes no fake initial chat, no default chat on launch, landing Continue Workspace only fo ... | docs/scopian/views/main/buffer/decisions/DEC-20260612-1656-user-centraldocs-live-ux-reliability-2RPR.md | approved_buffer | not_checked_in_generated_view |
| ITEM-allowed-with-limits-current-product-shape-public-ent-aa1ac5f5 | allowed_with_limits | Current product shape: Public entry points are the landing page, the compact `/workspace` route, and the fallback route.; The workspace is a single app surf ... | docs/scopian/sources/CENTRALDOCS_PRODUCT_SCOPE.md#current-product-shape | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-current-selected-context-show-ex-a17bdf62 | allowed_with_limits | Current Selected Context: Show exact selected document and folder names.; Show nested folder contents where useful.; Use a Remove text action rather than a ... | docs/scopian/sources/CENTRALDOCS_UX_SPEC.md#current-selected-context | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-deployment-checklist-configure-s-970519aa | allowed_with_limits | Deployment checklist: Configure S3 bucket, region, and credentials in backend environment.; Keep bucket objects private.; Configure CORS only for intended f ... | docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md#deployment-checklist | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-documents-get-api-documents-list-29bf293d | allowed_with_limits | Documents: `GET /api/documents` - list documents with filters.; `GET /api/documents/:documentId` - document detail.; `GET /api/documents/:documentId/preview ... | docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md#documents | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-extraction-and-chunking-headings-9d8beb80 | allowed_with_limits | Extraction and chunking: headings.; section titles.; important paragraphs.; table headers and compact row summaries. | docs/scopian/sources/CENTRALDOCS_RAG_AND_AI_DESIGN.md#extraction-and-chunking | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-folder-demosessionid-nullable-fo-c5dd66b4 | allowed_with_limits | Folder: `demoSessionId` nullable for mock folders.; `scope`: mock or user.; `mockId` and related stable public identity where seeded.; `name` | docs/scopian/sources/CENTRALDOCS_DATA_MODEL.md#folder | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-folders-get-api-folders-list-fol-53d3b506 | allowed_with_limits | Folders: `GET /api/folders` - list folder tree.; `POST /api/folders` - create user folder; `parentFolderId` is accepted where nesting is supported.; `PATCH ... | docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md#folders | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-hidden-ip-aware-quota-demo-sessi-0c678bec | allowed_with_limits | Hidden IP-aware quota: `DEMO_SESSION_TTL_DAYS=3`; `DEMO_QUOTA_WINDOW_DAYS=7`; `DEMO_IP_QUOTA_ENABLED=true` in production unless explicitly configured otherw ... | docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md#hidden-ip-aware-quota | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-local-layout-ed6f241b | allowed_with_limits | Local layout | docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md#local-layout | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-manifest-expectations-title-fold-240ee42f | allowed_with_limits | Manifest expectations: title.; folder slug or folder mock ID.; filename.; file kind. | docs/scopian/sources/CENTRALDOCS_MOCK_DATA_SPEC.md#manifest-expectations | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-mock-workspace-2ffa5bba | allowed_with_limits | Mock workspace | docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md#mock-workspace | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-private-local-and-ignored-areas-f9f93481 | allowed_with_limits | Private/local and ignored areas: `_reference/`; `docs/scopian/private/`; private progress reports.; private tool-feedback reports. | docs/scopian/sources/CENTRALDOCS_PUBLIC_PRIVATE_BOUNDARY.md#private-local-and-ignored-areas | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-product-identity-d2abf1c7 | allowed_with_limits | Product identity | docs/scopian/sources/CENTRALDOCS_PRODUCT_SCOPE.md#product-identity | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-public-upload-scope-txt-md-csv-t-c0ae199d | allowed_with_limits | Public upload scope: `.txt`; `.md`; `.csv`; `.tsv` | docs/scopian/sources/CENTRALDOCS_PRODUCT_SCOPE.md#public-upload-scope | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-reporting-files-changed-commands-7b7aa655 | allowed_with_limits | Reporting: files changed.; commands run.; pass/fail results.; known limits. | docs/scopian/sources/CENTRALDOCS_AGENT_PROTOCOL.md#reporting | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-required-agent-behavior-keep-pub-fa17a5ba | allowed_with_limits | Required agent behavior: Keep public/private boundaries intact.; Do not expose secrets.; Do not create real environment files.; Do not commit private report ... | docs/scopian/sources/CENTRALDOCS_AGENT_PROTOCOL.md#required-agent-behavior | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-safety-rules-validate-object-key-087dd43e | allowed_with_limits | Safety rules: Validate object keys before read/delete operations.; Allow S3 original-object read only for safe CentralDocs prefixes.; Reject path traversal ... | docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md#safety-rules | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-seeded-corpus-strategy-rollout-d-de49bcc7 | allowed_with_limits | Seeded corpus: Strategy & Rollout; Document Operations; Finance & Vendors; Customer & Support Signals | docs/scopian/sources/CENTRALDOCS_MOCK_DATA_SPEC.md#seeded-corpus | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-source-tree-the-attach-select-co-b1a3fb23 | allowed_with_limits | Source tree: The attach/select control is a tick/check before the folder or file icon.; Plus/add icons are reserved for New Chat or Add Folder actions.; Tic ... | docs/scopian/sources/CENTRALDOCS_UX_SPEC.md#source-tree | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-stable-identity-stable-mock-docu-d8d41559 | allowed_with_limits | Stable identity: stable mock document IDs.; stable mock folder IDs.; `folderMockId` links documents to seeded mock folders.; mock folders are read-only. | docs/scopian/sources/CENTRALDOCS_MOCK_DATA_SPEC.md#stable-identity | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-story-480ac357 | allowed_with_limits | Story | docs/scopian/sources/CENTRALDOCS_MOCK_DATA_SPEC.md#story | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-theme-and-tokens-use-slate-tinte-6fc8a021 | allowed_with_limits | Theme and tokens: Use slate-tinted neutral surfaces for the workspace.; Use deep document blue for primary actions, active tabs, and focus surfaces.; Use te ... | docs/scopian/sources/CENTRALDOCS_UX_SPEC.md#theme-and-tokens | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-workspace-shell-top-bar-with-lar-76bf0520 | allowed_with_limits | Workspace shell: Top bar with larger brand mark/name, backend status, session state, theme toggle, and no limit badges.; Left sidebar with Upload File at th ... | docs/scopian/sources/CENTRALDOCS_UX_SPEC.md#workspace-shell | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-ai-and-model-configuration-28bf0ff2 | likely_out_of_scope | AI and model configuration | docs/scopian/sources/CENTRALDOCS_ARCHITECTURE.md#ai-and-model-configuration | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-ai-provider-and-configuration-ai-c6884124 | likely_out_of_scope | AI provider and configuration: `AI_PROVIDER`; `GEMINI_EMBEDDING_MODEL`; `GEMINI_EMBEDDING_DIMENSIONS`; `GEMINI_GENERATION_PRIMARY_MODEL` | docs/scopian/sources/CENTRALDOCS_RAG_AND_AI_DESIGN.md#ai-provider-and-configuration | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-centraldocs-api-contract-3518b1b9 | likely_out_of_scope | CentralDocs API Contract | docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md#centraldocs-api-contract | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-chatmessage-chatsessionid-demose-c6265176 | likely_out_of_scope | ChatMessage: `chatSessionId`; `demoSessionId`; `role`: user or assistant.; `content` | docs/scopian/sources/CENTRALDOCS_DATA_MODEL.md#chatmessage | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-deployment-shape-frontend-is-the-af547522 | likely_out_of_scope | Deployment shape: `frontend/` is the Vercel project root.; `backend/` is the Render service root.; There is no root package manifest.; Frontend and backend ... | docs/scopian/sources/CENTRALDOCS_ARCHITECTURE.md#deployment-shape | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-document-demosessionid-nullable-f7878e86 | likely_out_of_scope | Document: `demoSessionId` nullable for mock documents.; `folderId`; `folderMockId` for stable seeded mock folder identity.; `scope`: mock, user, or generated. | docs/scopian/sources/CENTRALDOCS_DATA_MODEL.md#document | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-download-flow-a6fd6a75 | likely_out_of_scope | Download flow | docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md#download-flow | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-health-get-api-health-basic-back-6ee9dc08 | likely_out_of_scope | Health: `GET /api/health` - basic backend status.; `GET /api/health/warm` - Render warm-up route used before demo bootstrap.; `GET /api/health/dependencies` ... | docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md#health | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-limits-and-hidden-quota-errors-77b86d96 | likely_out_of_scope | Limits and hidden quota errors | docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md#limits-and-hidden-quota-errors | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-mock-files-f19842fd | likely_out_of_scope | Mock files | docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md#mock-files | read-only | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-preview-ux-ae8b0761 | likely_out_of_scope | Preview UX | docs/scopian/sources/CENTRALDOCS_UX_SPEC.md#preview-ux | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-registry-and-source-boundary-9714444c | likely_out_of_scope | Registry and source boundary | docs/scopian/sources/CENTRALDOCS_PUBLIC_PRIVATE_BOUNDARY.md#registry-and-source-boundary | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-scopian-workflow-28884711 | likely_out_of_scope | Scopian workflow | docs/scopian/sources/CENTRALDOCS_AGENT_PROTOCOL.md#scopian-workflow | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-secret-handling-mongodb-connecti-eabf3ace | likely_out_of_scope | Secret handling: MongoDB connection strings.; AWS access keys or secret keys.; Gemini API keys.; hidden IP hash secret values. | docs/scopian/sources/CENTRALDOCS_PUBLIC_PRIVATE_BOUNDARY.md#secret-handling | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-storage-layers-seeded-mock-files-d5496f1c | likely_out_of_scope | Storage layers: seeded mock files.; uploaded originals.; generated Markdown documents. | docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md#storage-layers | none | not_checked_in_generated_view |
| ITEM-conflict-detected-not-allowed-treat-autumdata-as-c-6edaef77 | conflict_detected | Not allowed: treat AutumData as current CentralDocs architecture.; copy old structure blindly.; migrate old code wholesale.; let AutumData override CentralD ... | docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md#not-allowed | none | not_checked_in_generated_view |
| ITEM-conflict-detected-s3-object-key-patterns-dac2aadc | conflict_detected | S3 object key patterns | docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md#s3-object-key-patterns | none | not_checked_in_generated_view |

## Coverage Snapshot

- likely_in_scope: 14
- allowed_with_limits: 31
- likely_out_of_scope: 15
- decision_required: 0
- conflict_detected: 2
- insufficient_evidence: 0

## PM Summary

- agent_enhanced: false
- template_only: true
- correctness_claim: false
- decision_required_items: 0
- out_of_scope_items: 15

## Changelog Snapshot

- generated_refresh: 2026-06-12T20:40:33+07:00
- selected_sources: 12
- approved_buffer_records: 14

## Freshness Metadata

- view: sha256:6571b0847051
- sources: sha256:cf123ad6f8e4
- buffer: sha256:4590c6624ff8
- context: sha256:5ef45bc1a5d7
- registry: sha256:ece12fe80b14

## Refresh Instructions

- Regenerate with `scopian view refresh` after source or buffer changes.
- Use `scopian view refresh --mode legacy_split` only when legacy split files are needed.
- Treat this generated file as scope evidence, not implementation correctness.
