# CentralDocs RAG and AI Design

## AI provider and configuration

CentralDocs uses Gemini for embeddings and generation. Runtime AI and vector-search configuration is centralized in backend environment config.

Required configuration variables:

- `AI_PROVIDER`
- `GEMINI_EMBEDDING_MODEL`
- `GEMINI_EMBEDDING_DIMENSIONS`
- `GEMINI_GENERATION_PRIMARY_MODEL`
- `GEMINI_GENERATION_FALLBACK_MODEL_1`
- `GEMINI_GENERATION_FALLBACK_MODEL_2`
- `MONGODB_VECTOR_INDEX_NAME`
- `MONGODB_VECTOR_PATH`

Defaults:

- Embedding model: `gemini-embedding-2`
- Embedding dimensions: `768`
- Generation primary model: `gemini-3.5-flash`
- Generation fallback 1: `gemini-3-flash-preview`
- Generation fallback 2: `gemini-2.5-flash`
- Vector index: `document_chunks_vector_index`
- Vector path: `embedding`

Model names and vector metadata may be shown in safe dependency summaries. API keys, raw provider requests, hidden prompts, and raw provider errors must not be exposed.

## Embedding lane

Embedding is used for:

- mock document indexing.
- uploaded document indexing.
- generated document indexing.
- semantic search query vectors.
- RAG retrieval.
- controlled direct mock media embedding cache.

Embedding validation uses the configured dimensions. Current production/demo behavior expects 768 dimensions.

## Generation lane

Generation uses a primary model plus configured fallback models. The lane supports key-slot rotation and fallback when rate limits or provider errors occur.

Generation actions include:

- RAG chat answers.
- generated Markdown documents from chat.

Provider failures should return safe errors. The frontend should not create fake assistant answers for provider failures.

## Extraction and chunking

CentralDocs should avoid embedding raw full documents when optimized text is available.

Keep:

- headings.
- section titles.
- important paragraphs.
- table headers and compact row summaries.
- page, slide, sheet, row, and media timestamp locators.
- useful media descriptions.

Compress or remove:

- repeated headers/footers.
- duplicated whitespace.
- boilerplate repeated across pages.
- styling-only text.
- OCR duplicates.

Chunk records keep source locators so answers can cite document sections, pages, sheets, rows, slides, or media timestamps.

## Retrieval behavior

RAG retrieval uses the selected document/folder context for the prompt. It excludes trashed and non-ready documents.

Current retrieval limits:

- `topKRetrieval`: 15
- `visibleReferences`: 10
- selected-document reference backfill can add one indexed chunk per selected document when retrieval misses an explicitly selected source.

The prompt builder should encourage use of all available relevant evidence and should not artificially stop at a lower source count when more relevant references are available.

## Search behavior

Semantic search accepts query text, selected document IDs, selected folder IDs, scope, and topK. Search results return citation-shaped source references without raw vectors.

Search and RAG share vector-search metadata:

- configured vector index name.
- configured vector path.
- configured embedding dimensions.

## Chat prompt context

Prompt context includes:

- current user prompt.
- selected document IDs.
- selected folder IDs resolved to documents.
- retrieved source chunks.
- selected-document backfill references where needed.
- recent chat messages and rolling summary when present.

Chat memory supports continuity, but document evidence drives answer grounding and references.

## Reference formatting

References are deduped at source/chunk level. When possible, dedupe by document ID and chunk ID. If chunk ID is missing, dedupe by document ID, source locator, and excerpt preview.

Citation parsing supports:

- `[1]`
- `[1, 2]`
- `[1-3]`
- `[1-3,5]`
- `[1-3,5-8]`

If the model cites specific numbers, displayed references should match those cited numbers when safe. If the model does not cite, display the deduped evidence references supplied to the model.

The same source/chunk should not appear under multiple citation numbers in a single answer.

## Assistant rendering

Assistant answers are Markdown and should render safely in the frontend without raw HTML execution. Supported visible formats include paragraphs, lists, bold text, inline code, code blocks, blockquotes, and tables when the renderer supports GFM.

## Generated documents

Generated documents are produced through explicit Generate Document actions. The instruction is optional. Empty instruction uses the default summary behavior: create a clear reusable document with key points, decisions, risks, next steps, and references when available.

Generated output defaults to Markdown, is stored in S3, registered as a Document, indexed, previewable, downloadable, attachable, and searchable.

## Mock media indexing

Mock audio/video/image assets are real files. Controlled seed/index workflows can use direct Gemini multimodal embedding once and cache `media_direct` chunks in MongoDB. Runtime demo prompts should reuse cached media chunks and source locators instead of re-embedding media each time.

Transcripts/notes may exist beside media files for fallback preview and human verification.
