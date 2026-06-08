import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb+srv://hidden-host.example/centraldocs";
process.env.AWS_REGION = "ap-southeast-1";
process.env.AWS_S3_BUCKET = "safe-summary-bucket";
process.env.AWS_ACCESS_KEY_ID = "safe-summary-access-token";
process.env.AWS_SECRET_ACCESS_KEY = "safe-summary-sensitive-token";
process.env.GEMINI_API_KEY_1 = "safe-summary-gemini-token";

const { DEMO_LIMITS } = await import("../src/config/limits.js");
const { env, getSafeConfigSummary } = await import("../src/config/env.js");

test("demo limits match locked CentralDocs decisions", () => {
  assert.equal(DEMO_LIMITS.sessionLifetimeDays, 3);
  assert.equal(DEMO_LIMITS.maxUploadedFiles, 5);
  assert.equal(DEMO_LIMITS.maxChatSessions, 5);
  assert.equal(DEMO_LIMITS.maxAiPrompts, 10);
  assert.equal(DEMO_LIMITS.maxGeneratedDocuments, 3);
  assert.equal(DEMO_LIMITS.maxUserFolders, 10);
  assert.equal(DEMO_LIMITS.maxStorageBytes, 20 * 1024 * 1024);
  assert.equal(DEMO_LIMITS.maxGeneratedDocumentBytes, 100 * 1024);
  assert.equal(DEMO_LIMITS.maxPromptLengthChars, 1500);
  assert.equal(DEMO_LIMITS.maxGenerateDocumentInstructionLengthChars, 2000);
  assert.equal(DEMO_LIMITS.maxSemanticSearchQueryLengthChars, 500);
  assert.equal(DEMO_LIMITS.topKRetrieval, 6);
  assert.equal(DEMO_LIMITS.visibleReferences, 5);
  assert.equal(DEMO_LIMITS.recentChatHistoryMessages, 8);
});

test("safe config summary does not expose sensitive values", () => {
  const summary = getSafeConfigSummary();
  const serialized = JSON.stringify(summary);

  assert.equal(env.NODE_ENV, "test");
  assert.equal(summary.mongodb, "configured");
  assert.equal(summary.s3, "configured");
  assert.equal(summary.geminiKeyCount, 1);
  assert.equal(serialized.includes("hidden-host.example"), false);
  assert.equal(serialized.includes("safe-summary-access-token"), false);
  assert.equal(serialized.includes("safe-summary-sensitive-token"), false);
  assert.equal(serialized.includes("safe-summary-gemini-token"), false);
});
