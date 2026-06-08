---
generated_by: scopian
generator_schema: v0.2-B
view: main
generated_at: 2026-06-09T02:42:13+07:00
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
  sources: sha256:3b3a902076b8
  buffer: sha256:e3b0c44298fc
  context: sha256:5ef45bc1a5d7
  registry: sha256:8cb489af4f0e
---

# Generated Scope View

## Non-Canonical Notice

This file is generated and non-canonical.
Canonical scope comes from VIEW.md, selected Scope Sources, approved Scope Buffer records, context.yml, and source_registry.yml.
Regenerate with `scopian view refresh` after source or buffer changes.

## Active Scope View

- view: main
- view_path: docs/scopian/views/main/VIEW.md
- generated_at: 2026-06-09T02:42:13+07:00

## Selected Sources

- docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md (sha256:1ca18870b63cf2308ecd97b40ce82d02d3e593b8a60c493471c497956b805970)
- docs/scopian/sources/CENTRALDOCS_AGENT_PROTOCOL.md (sha256:050f94c5b292d834ca9b6a1a3eb1811ab3bab8c7f28ae1995f602e41a74a58fe)
- docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md (sha256:69e59d6309e5580e0fdd058bc5079bc09e2e122bddc94f845c8e65d5d8326365)
- docs/scopian/sources/CENTRALDOCS_ARCHITECTURE.md (sha256:905e747805c68d63b389571a8c0f745cdf71d06f2b9b099d48b4b7c3e717e569)
- docs/scopian/sources/CENTRALDOCS_DATA_MODEL.md (sha256:4d7d6556237d4ff5a50c2ad37778a7ad9876c714c711d649a13db5da7f2aeaca)
- docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md (sha256:560745ee7b5f668f5ecae75e5ac084f3a37443768fb8711aa36003acb8e714e6)
- docs/scopian/sources/CENTRALDOCS_MOCK_DATA_SPEC.md (sha256:8b16910718fc8262ada5e8eb613bbb395a743872f057f4ff2829c4360d7dc2cf)
- docs/scopian/sources/CENTRALDOCS_PRODUCT_SCOPE.md (sha256:aeb20a292cf5656a9ede4c53b5c6e7d1fa5b4fc39ec3a91efba96cd3869af373)
- docs/scopian/sources/CENTRALDOCS_PUBLIC_PRIVATE_BOUNDARY.md (sha256:a492c982fd3c9045ac7d27dd7cf0a9f480cee06f65c8318ddb53fd3d4dcb292e)
- docs/scopian/sources/CENTRALDOCS_RAG_AND_AI_DESIGN.md (sha256:3109a796ed13b76078f4f8ea7be38d81de51c772a7bf86b1374ef256c9f79d04)
- docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md (sha256:cf87f44d00c544ef4961b2af46cfb21d66e18aae74ad6ab33be0f5f73ff603ec)
- docs/scopian/sources/CENTRALDOCS_UX_SPEC.md (sha256:befc354df7997865ae633cc47c0da474068a72805fb747aa7f322c66bb74f57b)

## Approved Buffer Summary

- none

## Scope Checklist

| Item ID | Scope Signal | Scope Item | Refs | Flags | Implementation Evidence |
|---|---|---|---|---|---|
| ITEM-likely-in-scope-allowed-uses-visual-inspiration-d9a79e42 | likely_in_scope | Allowed uses: visual inspiration.; old file/folder behavior.; old RAG flow ideas.; useful implementation clues. | docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md#allowed-uses | none | not_checked_in_generated_view |
| ITEM-likely-in-scope-public-upload-limits-txt-md-csv-83b40cac | likely_in_scope | Public upload limits: `.txt`, `.md`, `.csv`, `.tsv`, `.pdf`, `.docx`; `.txt`, `.md`, `.csv`, `.tsv`: 500 KB.; `.docx`: 1 MB.; `.pdf`: 2 MB or 10 pages. | docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md#public-upload-limits | none | not_checked_in_generated_view |
| ITEM-likely-in-scope-upload-ux-txt-md-csv-tsv-pdf-doc-3432d94b | likely_in_scope | Upload UX: `.txt`, `.md`, `.csv`, `.tsv`, `.pdf`, `.docx` | docs/scopian/sources/CENTRALDOCS_UX_SPEC.md#upload-ux | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-ai-layers-model-gemini-embedding-43efe2e1 | allowed_with_limits | AI layers: Model: `gemini-embedding-2`; Dimensions: `768`; Purpose: semantic search, chat retrieval, generated document indexing, mock media cached embeddin ... | docs/scopian/sources/CENTRALDOCS_RAG_AND_AI_DESIGN.md#ai-layers | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-autumdata-reference-boundary-84fbdb6e | allowed_with_limits | AutumData Reference Boundary | docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md#autumdata-reference-boundary | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-data-ownership-mongodb-is-the-me-bb095e09 | allowed_with_limits | Data ownership: MongoDB is the metadata and vector-search source of truth.; S3 is the binary/file source of truth.; Render local filesystem is temporary onl ... | docs/scopian/sources/CENTRALDOCS_ARCHITECTURE.md#data-ownership | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-documents-get-documents-list-doc-4677f5d1 | allowed_with_limits | Documents: `GET /documents` - list documents with filters including trash.; `POST /documents/upload` - upload one supported file.; `GET /documents/:document ... | docs/scopian/sources/CENTRALDOCS_API_CONTRACT.md#documents | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-documents-ux-file-icon-title-fil-c126ef42 | allowed_with_limits | Documents UX: File icon.; Title.; File type badge.; Source badge: Mock, Uploaded, Generated. | docs/scopian/sources/CENTRALDOCS_UX_SPEC.md#documents-ux | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-explicit-non-goals-for-first-pub-2a8c95dd | allowed_with_limits | Explicit non-goals for first public demo: Normal user registration/login.; Team roles or permissions.; Enterprise approval workflows.; Bulk upload. | docs/scopian/sources/CENTRALDOCS_PRODUCT_SCOPE.md#explicit-non-goals-for-first-public-demo | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-extraction-optimization-headings-f31e801a | allowed_with_limits | Extraction optimization: headings.; section titles.; important paragraphs.; table headers. | docs/scopian/sources/CENTRALDOCS_RAG_AND_AI_DESIGN.md#extraction-optimization | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-local-layout-ed6f241b | allowed_with_limits | Local layout | docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md#local-layout | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-manifest-5ac0d2bf | allowed_with_limits | Manifest | docs/scopian/sources/CENTRALDOCS_MOCK_DATA_SPEC.md#manifest | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-mock-files-bc1e2dda | allowed_with_limits | Mock files | docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md#mock-files | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-mock-media-indexing-570a7246 | allowed_with_limits | Mock media indexing | docs/scopian/sources/CENTRALDOCS_RAG_AND_AI_DESIGN.md#mock-media-indexing | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-mock-workspace-2ffa5bba | allowed_with_limits | Mock workspace | docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md#mock-workspace | read-only | not_checked_in_generated_view |
| ITEM-allowed-with-limits-product-identity-d2abf1c7 | allowed_with_limits | Product identity | docs/scopian/sources/CENTRALDOCS_PRODUCT_SCOPE.md#product-identity | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-semantic-search-ux-query-box-sco-e75e36fc | allowed_with_limits | Semantic Search UX: Query box.; Scope selector: all demo docs, selected folders, selected documents, uploaded only, generated only.; Search button. | docs/scopian/sources/CENTRALDOCS_UX_SPEC.md#semantic-search-ux | none | not_checked_in_generated_view |
| ITEM-allowed-with-limits-soft-delete-hidden-from-normal-w-eb2a8374 | allowed_with_limits | Soft delete: hidden from normal workspace.; shown in Trash filter.; excluded from semantic search.; excluded from chat attachment selector. | docs/scopian/sources/CENTRALDOCS_STORAGE_DESIGN.md#soft-delete | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-deployment-shape-85757787 | likely_out_of_scope | Deployment shape | docs/scopian/sources/CENTRALDOCS_ARCHITECTURE.md#deployment-shape | none | not_checked_in_generated_view |
| ITEM-likely-out-of-scope-public-private-boundary-2514a0dd | likely_out_of_scope | Public/private boundary | docs/scopian/sources/CENTRALDOCS_ARCHITECTURE.md#public-private-boundary | none | not_checked_in_generated_view |
| ITEM-conflict-detected-not-allowed-treat-autumdata-as-c-f58f85a9 | conflict_detected | Not allowed: treat AutumData as current architecture.; copy old messy structure blindly.; migrate old code wholesale.; override CentralDocs specs with Autum ... | docs/scopian/sources/AUTUMDATA_REFERENCE_BOUNDARY.md#not-allowed | none | not_checked_in_generated_view |

## Coverage Snapshot

- likely_in_scope: 3
- allowed_with_limits: 15
- likely_out_of_scope: 2
- decision_required: 0
- conflict_detected: 1
- insufficient_evidence: 0

## PM Summary

- agent_enhanced: false
- template_only: true
- correctness_claim: false
- decision_required_items: 0
- out_of_scope_items: 2

## Changelog Snapshot

- generated_refresh: 2026-06-09T02:42:13+07:00
- selected_sources: 12
- approved_buffer_records: 0

## Freshness Metadata

- view: sha256:6571b0847051
- sources: sha256:3b3a902076b8
- buffer: sha256:e3b0c44298fc
- context: sha256:5ef45bc1a5d7
- registry: sha256:8cb489af4f0e

## Refresh Instructions

- Regenerate with `scopian view refresh` after source or buffer changes.
- Use `scopian view refresh --mode legacy_split` only when legacy split files are needed.
- Treat this generated file as scope evidence, not implementation correctness.
