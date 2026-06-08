# CentralDocs RAG and AI Design

## AI layers

CentralDocs separates embeddings from generation.

Embedding lane:

- Model: `gemini-embedding-2`
- Dimensions: `768`
- Purpose: semantic search, chat retrieval, generated document indexing, mock media cached embeddings.

Generation lane:

- Primary: `gemini-3.5-flash`
- Fallback 1: `gemini-3-flash-preview`
- Fallback 2: `gemini-2.5-flash`

Failure handling:

1. Try current key slot and primary model.
2. If rate-limited, rotate key slots on same model.
3. If all key slots fail, use fallback model 1.
4. If still failing, use fallback model 2.
5. If all fail, return graceful demo-limit response.

Key rotation only helps when keys belong to separate quota pools/projects. Do not expose key information in UI.

## Extraction optimization

Do not embed raw full documents blindly.

Keep:

- headings.
- section titles.
- important paragraphs.
- table headers.
- compact table rows.
- page/slide/sheet/row/timestamp locators.
- short media descriptions.

Remove/compress:

- repeated headers/footers.
- duplicate whitespace.
- boilerplate repeated across pages.
- very long rows.
- styling-only text.
- OCR duplicates.

Budgets:

- max optimized text per uploaded file: 24,000 characters.
- target chunk: 700-900 tokens.
- overlap: ~80 tokens.
- max chunks per uploaded file: 10.
- max chunks per generated document: 8.
- topK retrieval per chat answer: 6.

## Retrieval behavior

Chat retrieval always filters by the resolved document snapshot for the prompt. It excludes trashed documents/folders and non-ready documents.

Search filter fields:

- demoSessionId
- documentId
- folderId
- scope
- fileKind
- lifecycleStatus
- status

## Chat context

Use:

- current user prompt.
- resolved document selection.
- retrieved source chunks.
- recent 8 messages.
- rolling summary for long chats.

Keep chat memory separate from document evidence. Document evidence drives references.

## References used

Every assistant answer should save and show references used.

Reference object includes:

- citation number.
- document title.
- file type.
- folder.
- chunk ID.
- source locator: page, slide, sheet, row range, media timestamp.
- excerpt preview.
- similarity score.
- used-for note.

UI default:

```text
▸ References used: 3
```

## Mock media indexing

Mock audio/video files must be real downloadable files. For demo efficiency, direct Gemini multimodal embedding for mock media should run only during mock-data seeding or controlled pre-indexing. Store the resulting media embeddings/chunks in MongoDB and reuse them in demo. Do not re-embed mock media on each user prompt.

Implementation rule:

```text
Seed/build step: direct Gemini multimodal embedding once -> save cached embeddings.
Runtime demo: use cached media embeddings and source locators.
```

Include transcript/notes beside media for fallback previews and human verification, but the intended demo indexing path for media is direct multimodal embedding once, then cached use.

## Generated documents

Generated documents are produced through a separate Generate Document action with free-form instruction. Output defaults to Markdown. The generated file is uploaded to S3, stored as a Document, indexed, and can be cited in future answers.
