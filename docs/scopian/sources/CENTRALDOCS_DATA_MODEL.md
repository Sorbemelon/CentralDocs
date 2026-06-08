# CentralDocs Data Model

## DemoSession

Fields:

- sessionId
- status: active | expired
- createdAt
- lastActiveAt
- expiresAt
- limits: maxUploads, maxChats, maxPrompts, maxGeneratedDocuments, maxStorageBytes
- usage: uploadedFileCount, chatSessionCount, aiPromptCount, generatedDocumentCount, storageBytes
- cleanupStatus

## Folder

Fields:

- demoSessionId nullable
- scope: mock | user
- name
- parentFolderId nullable
- path
- readOnly
- documentCount
- lifecycleStatus: active | trashed
- deletedAt nullable
- deletedByDemoSessionId nullable
- deleteOperationId nullable
- restoreParentFolderId nullable
- createdAt
- updatedAt

Mock folders use `scope=mock`, `readOnly=true`, `demoSessionId=null`. User folders use `scope=user`, `readOnly=false`, and a session ID.

## Document

Fields:

- demoSessionId nullable
- folderId nullable
- scope: mock | user | generated
- sourceType: mock | upload | generated
- title
- originalFilename
- downloadFilename
- fileExtension
- mimeType
- fileKind: text | markdown | csv | tsv | pdf | docx | xlsx | pptx | image | audio | video
- storageProvider: s3
- objectKey
- sizeBytes
- checksum
- status: uploaded | extracting | optimizing | chunking | embedding | ready | failed
- statusMessage
- lifecycleStatus: active | trashed
- deletedAt nullable
- deletedByDemoSessionId nullable
- deleteOperationId nullable
- originalFolderIdBeforeDelete nullable
- extractedTextPreview
- contentStats: extractedCharCount, optimizedCharCount, estimatedTokenCount, chunkCount
- generatedMeta nullable: fromChatSessionId, generationInstruction, sourceMessageIds, sourceDocumentIds, referencesIncluded
- readOnly
- createdAt
- updatedAt
- expiresAt nullable

## DocumentChunk

Fields:

- documentId
- demoSessionId nullable
- folderId nullable
- scope: mock | user | generated
- chunkIndex
- content
- embedding
- embeddingModel: gemini-embedding-2
- embeddingDimensions: 768
- tokenEstimate
- sourceLocator: pageNumber, slideNumber, sheetName, rowStart, rowEnd, sectionTitle, mediaTimestampStart, mediaTimestampEnd
- createdAt

## ChatSession

Fields:

- demoSessionId
- title
- currentSelectedDocumentIds
- currentSelectedFolderIds
- rollingSummary
- messageCount
- aiPromptCount
- archivedAt nullable
- createdAt
- updatedAt
- lastMessageAt

## ChatMessage

Fields:

- chatSessionId
- demoSessionId
- role: user | assistant
- content
- status: pending | complete | failed
- attachedDocumentSnapshot
- attachedFolderSnapshot
- resolvedDocumentSnapshot
- referencesUsed
- aiMeta nullable: actionType, generationModel, fallbackUsed, fallbackLevel, keySlotUsed, estimatedInputTokens, estimatedOutputTokens, latencyMs
- createdAt

## ReferenceUsed

Fields:

- citationNumber
- documentId
- documentTitle
- fileType
- folderName
- chunkId
- sectionTitle
- pageNumber
- slideNumber
- sheetName
- rowRange
- mediaTimestamp
- excerptPreview
- similarityScore
- usedFor

## AiRoutingAttempt

Fields:

- demoSessionId
- actionType: embedding | chat | generate_document
- model
- keySlot
- status: success | failed
- errorType
- isRateLimit
- fallbackLevel
- createdAt

## UsageEvent

Fields:

- demoSessionId
- eventType
- resourceType
- resourceId
- countDelta
- storageDelta
- status
- createdAt
