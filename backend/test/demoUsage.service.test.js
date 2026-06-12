import { test } from "node:test";
import assert from "node:assert/strict";

const { DEMO_LIMITS } = await import("../src/config/limits.js");
const {
  applyUsageDelta,
  assertCanCreateChat,
  assertCanCreateFolder,
  assertCanGenerateDocument,
  assertCanSendAiPrompt,
  assertCanUploadFile,
  assertGenerateDocumentInstructionLength,
  assertPromptLength,
  assertSemanticSearchQueryLength,
  buildChatLifecycleUsageDelta,
  buildDocumentLifecycleUsageDelta,
  getRemainingLimits,
  getUsageSnapshot,
} = await import("../src/services/demo/demoUsage.service.js");

function sessionWithUsage(usage) {
  return { usage };
}

test("usage service computes remaining limits correctly", () => {
  const session = sessionWithUsage({
    uploadedFiles: 2,
    chatSessions: 1,
    aiPrompts: 4,
    generatedDocuments: 1,
    userFolders: 3,
    storageBytes: 1024,
  });

  assert.equal(getUsageSnapshot(session).uploadedFiles, 2);
  assert.equal(getRemainingLimits(session).uploadedFiles, 3);
  assert.equal(getRemainingLimits(session).chatSessions, 4);
  assert.equal(getRemainingLimits(session).aiPrompts, 6);
  assert.equal(getRemainingLimits(session).generatedDocuments, 2);
  assert.equal(getRemainingLimits(session).userFolders, 7);
  assert.equal(getRemainingLimits(session).storageBytes, 20 * 1024 * 1024 - 1024);
  assert.equal(getRemainingLimits(session).generatedDocumentBytes, 100 * 1024);
});

test("usage service rejects upload count and storage limit breaches", () => {
  assert.throws(() => assertCanUploadFile(sessionWithUsage({ uploadedFiles: 5 }), 1), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(
    () =>
      assertCanUploadFile(
        sessionWithUsage({ uploadedFiles: 0, storageBytes: 20 * 1024 * 1024 - 10 }),
        11,
      ),
    { code: "DEMO_LIMIT_REACHED" },
  );
});

test("usage service rejects chat, prompt, generated document, and folder limits", () => {
  assert.throws(() => assertCanCreateChat(sessionWithUsage({ chatSessions: 5 })), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(() => assertCanSendAiPrompt(sessionWithUsage({ aiPrompts: 10 })), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(
    () => assertCanGenerateDocument(sessionWithUsage({ generatedDocuments: 3 })),
    { code: "DEMO_LIMIT_REACHED" },
  );
  assert.throws(() => assertCanCreateFolder(sessionWithUsage({ userFolders: 10 })), {
    code: "DEMO_LIMIT_REACHED",
  });
});

test("usage service validates text length limits", () => {
  assert.equal(DEMO_LIMITS.maxChatSessions, 5);
  assert.equal(DEMO_LIMITS.maxPromptLengthChars, 1500);
  assert.throws(() => assertPromptLength("x".repeat(1501)), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(() => assertGenerateDocumentInstructionLength("x".repeat(2001)), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(() => assertSemanticSearchQueryLength("x".repeat(501)), {
    code: "DEMO_LIMIT_REACHED",
  });
});

test("usage service applies usage deltas without negative counters", () => {
  const next = applyUsageDelta(sessionWithUsage({ uploadedFiles: 2, storageBytes: 100 }), {
    uploadedFiles: 1,
    storageBytes: -200,
  });

  assert.equal(next.usage.uploadedFiles, 3);
  assert.equal(next.usage.storageBytes, 0);
});

test("usage service builds create-only lifecycle deltas for uploaded and generated documents", () => {
  assert.deepEqual(
    buildDocumentLifecycleUsageDelta({
      scope: "user",
      sourceType: "upload",
      sizeBytes: 120,
    }, "create"),
    { uploadedFiles: 1, storageBytes: 120 },
  );
  assert.deepEqual(
    buildDocumentLifecycleUsageDelta({
      scope: "generated",
      sourceType: "generated",
      sizeBytes: 80,
    }, "create"),
    { generatedDocuments: 1, storageBytes: 80 },
  );
  assert.deepEqual(
    buildDocumentLifecycleUsageDelta({
      scope: "user",
      sourceType: "upload",
      sizeBytes: 120,
    }, "delete"),
    {},
  );
  assert.deepEqual(
    buildDocumentLifecycleUsageDelta({
      scope: "generated",
      sourceType: "generated",
      sizeBytes: 80,
    }, "restore"),
    {},
  );
  assert.deepEqual(
    buildDocumentLifecycleUsageDelta({
      scope: "mock",
      sourceType: "mock",
      sizeBytes: 80,
    }, "delete"),
    {},
  );
});

test("usage service builds lifecycle deltas for chat sessions", () => {
  assert.deepEqual(buildChatLifecycleUsageDelta("create"), { chatSessions: 1 });
  assert.deepEqual(buildChatLifecycleUsageDelta("delete"), { chatSessions: -1 });
});
