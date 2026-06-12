# CentralDocs Mock Data Specification

## Story

The mock workspace uses a fictional business scenario called Orchid Retail Digital Transformation. Orchid Retail is a demo corpus only; it is not the CentralDocs product identity.

All mock files should relate to the same story so semantic search, RAG chat, citations, and generated documents feel connected.

## Seeded corpus

The current seeded corpus contains 16 mock documents across stable folders.

Representative folders:

- Strategy & Rollout
- Document Operations
- Finance & Vendors
- Customer & Support Signals
- Meeting Evidence
- Generated Examples

Representative file types:

- Markdown
- PDF
- DOCX
- XLSX
- PPTX
- CSV
- TSV
- PNG
- MP3
- MP4

Public upload remains limited to lightweight document/text formats. Rich media, XLSX, and PPTX appear only through controlled mock seed data.

## Stable identity

Mock folders/documents use stable public identity so seeded data can be reloaded without breaking frontend references.

Required identity behavior:

- stable mock document IDs.
- stable mock folder IDs.
- `folderMockId` links documents to seeded mock folders.
- mock folders are read-only.
- mock documents are read-only.
- mock data is preserved on Clear Session and expired session cleanup.

## Media and sidecar data

Mock audio/video/image files are real files and downloadable after seeding.

Media indexing behavior:

- Direct Gemini multimodal embedding can run during controlled seed/index work.
- Cached `media_direct` chunks are stored in MongoDB.
- Runtime demo prompts reuse cached media chunks.
- Transcript or notes files can exist beside media for preview and verification.

## Manifest expectations

The mock manifest should describe:

- title.
- folder slug or folder mock ID.
- filename.
- file kind.
- MIME type.
- source type.
- read-only flag.
- indexing mode.
- sidecar extraction file when present.
- demo topics.
- suggested question relationships.

## Demo questions

Suggested questions should be short, easy to understand, and tied to actual mock files. When a suggested question is clicked, the frontend may select associated mock files and clear unrelated selections.
