import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";

const { app } = await import("../src/app.js");
const { toDocumentDto } = await import("../src/services/documents/document.dto.js");
const { toDocumentStatusDto } = await import("../src/services/uploads/uploadResult.dto.js");
const { toFolderDto } = await import("../src/services/folders/folder.dto.js");
const { toSemanticSearchResponseDto } = await import("../src/services/search/searchResult.dto.js");
const { toChatMessageDto } = await import("../src/services/chats/chatMessage.dto.js");
const { toChatSessionDto } = await import("../src/services/chats/chatSession.dto.js");
const { toGeneratedDocumentResponseDto } = await import(
  "../src/services/generatedDocuments/generatedDocument.dto.js"
);

const forbiddenTokens = [
  "AKIA",
  "AWS_SECRET_ACCESS_KEY",
  "GEMINI_API_KEY",
  "mongodb+srv://",
  "demo-sessions/demo_123",
  "private/object/key",
  "embedding\":[",
  "C:\\Users\\",
  "/home/user/",
  "docs/scopian/private",
  "_reference/",
  "raw-provider-body",
  "fileBuffer",
];

function assertSafe(value) {
  const text = JSON.stringify(value);
  for (const token of forbiddenTokens) {
    assert.equal(text.includes(token), false, `${token} leaked`);
  }
}

test("frontend DTOs hide internal storage, vector, path, and provider fields", () => {
  const document = toDocumentDto({
    _id: "doc_1",
    title: "Upload",
    originalFilename: "upload.md",
    downloadFilename: "upload.md",
    fileExtension: "md",
    mimeType: "text/markdown",
    fileKind: "markdown",
    scope: "user",
    sourceType: "upload",
    readOnly: false,
    status: "ready",
    lifecycleStatus: "active",
    objectKey: "demo-sessions/demo_123/uploads/doc_1/upload.md",
    embedding: [1, 2, 3],
    contentStats: { chunkCount: 1 },
  });
  const status = toDocumentStatusDto({
    _id: "doc_1",
    status: "failed",
    lifecycleStatus: "active",
    scope: "user",
    sourceType: "upload",
    storageProvider: "s3",
    objectKey: "demo-sessions/demo_123/uploads/doc_1/upload.md",
    contentStats: {},
  });
  const folder = toFolderDto({
    _id: "folder_1",
    name: "Uploads",
    path: "/Uploads",
    scope: "user",
    readOnly: false,
    lifecycleStatus: "active",
    objectKey: "private/object/key",
  });
  const chatSession = toChatSessionDto({
    _id: "chat_1",
    title: "Chat",
    currentSelectedDocumentIds: ["doc_1"],
    currentSelectedFolderIds: ["folder_1"],
    lifecycleStatus: "active",
    objectKey: "private/object/key",
  });

  assertSafe({ document, status, folder, chatSession });
  assert.equal(document.downloadAvailable, true);
  assert.equal(status.retryAvailable, true);
});

test("search, chat, and generated-document DTOs expose citation-ready data only", () => {
  const documentsById = new Map([
    [
      "doc_1",
      {
        id: "doc_1",
        title: "Risk Register",
        fileKind: "csv",
        folderName: "Operations",
        objectKey: "demo-sessions/demo_123/uploads/doc_1/risk.csv",
      },
    ],
  ]);
  const search = toSemanticSearchResponseDto({
    request: { query: "risk", topK: 6 },
    scope: {
      selectedDocumentIds: ["doc_1"],
      selectedFolderIds: [],
      resolvedDocumentIds: ["doc_1"],
      scope: "all",
      searchedDocumentCount: 1,
      documentsById,
    },
    matches: [
      {
        chunkId: "chunk_1",
        documentId: "doc_1",
        contentPreview: "Approval owner missing.",
        score: 0.9,
        embedding: [0.1, 0.2],
      },
    ],
    references: [
      {
        citationNumber: 1,
        documentId: "doc_1",
        documentTitle: "Risk Register",
        fileType: "csv",
        folderName: "Operations",
        chunkId: "chunk_1",
        excerptPreview: "Approval owner missing.",
        similarityScore: 0.9,
      },
    ],
    embeddingResult: {
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: [0.1, 0.2],
    },
  });
  const chatMessage = toChatMessageDto({
    _id: "message_1",
    chatSessionId: "chat_1",
    role: "assistant",
    content: "Approval ownership is the risk [1].",
    status: "complete",
    referencesUsed: search.references,
    aiMeta: {
      actionType: "chat_answer",
      generationModel: "gemini-3.5-flash",
      keySlotUsed: 1,
      rawProviderError: "raw-provider-body",
    },
    objectKey: "private/object/key",
  });
  const generated = toGeneratedDocumentResponseDto({
    document: {
      _id: "generated_1",
      title: "Brief",
      downloadFilename: "brief.md",
      fileKind: "markdown",
      scope: "generated",
      sourceType: "generated",
      status: "ready",
      lifecycleStatus: "active",
      objectKey: "demo-sessions/demo_123/generated/generated_1/brief.md",
      contentStats: { chunkCount: 1 },
    },
    generation: {
      model: "gemini-3.5-flash",
      keySlot: 0,
      rawProviderError: "raw-provider-body",
      indexed: true,
    },
    download: {
      available: true,
      filename: "brief.md",
      downloadUrl: "https://signed.example/brief.md",
      expiresInSeconds: 300,
    },
  });

  assertSafe({ search, chatMessage, generated });
  assert.equal(search.stats.embeddingDimensions, 768);
  assert.equal(chatMessage.aiMeta.generationModel, "gemini-3.5-flash");
  assert.equal(generated.generation.indexed, true);
});

test("health dependency response does not expose configured secret values", async () => {
  const response = await request(app).get("/api/health/dependencies").expect(200);

  assertSafe(response.body);
  assert.equal("accessKeyId" in response.body.dependencies.s3, false);
  assert.equal("secretAccessKey" in response.body.dependencies.s3, false);
});
