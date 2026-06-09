import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const { AI_ACTION_TYPE } = await import("../src/constants/ai.constants.js");
const { CHAT_MESSAGE_STATUS, CHAT_ROLE, REFERENCE_USED_FIELDS } = await import(
  "../src/constants/chat.constants.js"
);
const { LIFECYCLE_STATUS } = await import("../src/constants/lifecycle.constants.js");
const { ChatMessage } = await import("../src/models/ChatMessage.model.js");
const { ChatSession } = await import("../src/models/ChatSession.model.js");

function hasIndex(schema, expectedFields) {
  return schema.indexes().some(([fields]) => JSON.stringify(fields) === JSON.stringify(expectedFields));
}

test("ChatSession schema has defaults and indexes", () => {
  const session = new ChatSession({
    demoSessionId: "demo_123",
    title: "Rollout questions",
    currentSelectedDocumentIds: ["mock_document_rollout_plan"],
    currentSelectedFolderIds: ["mock_folder_strategy"],
  });

  assert.equal(session.messageCount, 0);
  assert.equal(session.aiPromptCount, 0);
  assert.equal(session.lifecycleStatus, LIFECYCLE_STATUS.ACTIVE);
  assert.deepEqual(session.currentSelectedDocumentIds, ["mock_document_rollout_plan"]);
  assert.deepEqual(session.currentSelectedFolderIds, ["mock_folder_strategy"]);
  assert.equal(session.validateSync(), undefined);

  assert.equal(hasIndex(ChatSession.schema, { demoSessionId: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(ChatSession.schema, { lastMessageAt: -1 }), true);
  assert.equal(hasIndex(ChatSession.schema, { archivedAt: 1 }), true);
});

test("ChatMessage reference snapshots accept expected source reference object", () => {
  const documentId = new mongoose.Types.ObjectId();
  const chunkId = new mongoose.Types.ObjectId();
  const message = new ChatMessage({
    chatSessionId: new mongoose.Types.ObjectId(),
    demoSessionId: "demo_123",
    role: CHAT_ROLE.ASSISTANT,
    content: "The rollout risk is training adoption.",
    status: CHAT_MESSAGE_STATUS.COMPLETE,
    referencesUsed: [
      {
        citationNumber: 1,
        documentId,
        documentTitle: "Digital Workspace Rollout Plan",
        fileType: "pptx",
        folderName: "Strategy & Rollout",
        chunkId,
        sectionTitle: "Risks",
        pageNumber: 2,
        slideNumber: 4,
        sheetName: null,
        rowRange: null,
        mediaTimestamp: null,
        excerptPreview: "Training adoption risk is moderate.",
        similarityScore: 0.91,
        usedFor: "answer",
      },
    ],
    aiMeta: {
      actionType: AI_ACTION_TYPE.CHAT_ANSWER,
      generationModel: "gemini-3.5-flash",
      fallbackUsed: false,
      fallbackLevel: 0,
      keySlotUsed: 1,
      estimatedInputTokens: 100,
      estimatedOutputTokens: 40,
      latencyMs: 250,
    },
  });

  assert.equal(message.validateSync(), undefined);
  assert.equal(message.referencesUsed[0].citationNumber, 1);
  assert.equal(String(message.referencesUsed[0].documentId), String(documentId));
  assert.equal(String(message.referencesUsed[0].chunkId), String(chunkId));
  assert.equal(message.aiMeta.actionType, AI_ACTION_TYPE.CHAT_ANSWER);

  for (const field of REFERENCE_USED_FIELDS) {
    assert.ok(field in message.referencesUsed[0].toObject());
  }
});

test("ChatMessage user snapshots accept saved selected context shape", () => {
  const message = new ChatMessage({
    chatSessionId: new mongoose.Types.ObjectId(),
    demoSessionId: "demo_123",
    role: CHAT_ROLE.USER,
    content: "What are the rollout risks?",
    status: CHAT_MESSAGE_STATUS.COMPLETE,
    attachedDocumentSnapshot: [
      {
        id: "mock_document_rollout_plan",
        title: "Rollout Plan",
        fileKind: "pptx",
        sourceType: "mock",
        scope: "mock",
        folderId: "mock_folder_strategy",
        folderName: "Strategy",
        status: "ready",
        lifecycleStatus: "active",
      },
    ],
    attachedFolderSnapshot: [
      {
        id: "mock_folder_strategy",
        name: "Strategy",
        scope: "mock",
        path: "/Strategy",
        readOnly: true,
        lifecycleStatus: "active",
      },
    ],
    resolvedDocumentSnapshot: [
      {
        id: "mock_document_rollout_plan",
        title: "Rollout Plan",
        fileKind: "pptx",
        sourceType: "mock",
        scope: "mock",
        folderId: "mock_folder_strategy",
        folderName: "Strategy",
        resolvedFromFolderIds: ["mock_folder_strategy"],
        status: "ready",
        lifecycleStatus: "active",
      },
    ],
    referencesUsed: [],
    aiMeta: null,
  });

  assert.equal(message.validateSync(), undefined);
  assert.equal(message.attachedDocumentSnapshot[0].id, "mock_document_rollout_plan");
  assert.deepEqual(message.resolvedDocumentSnapshot[0].resolvedFromFolderIds, [
    "mock_folder_strategy",
  ]);
});

test("ChatMessage indexes support session and role lookups", () => {
  assert.equal(hasIndex(ChatMessage.schema, { chatSessionId: 1, createdAt: 1 }), true);
  assert.equal(hasIndex(ChatMessage.schema, { demoSessionId: 1, createdAt: 1 }), true);
  assert.equal(hasIndex(ChatMessage.schema, { role: 1 }), true);
});
