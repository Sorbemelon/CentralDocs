import { test } from "node:test";
import assert from "node:assert/strict";

const { FOLDER_SCOPE, FOLDER_SCOPES } = await import("../src/constants/document.constants.js");
const { LIFECYCLE_STATUS, LIFECYCLE_STATUSES } = await import(
  "../src/constants/lifecycle.constants.js"
);
const models = await import("../src/models/index.js");
const { Folder } = models;

function hasIndex(schema, expectedFields) {
  return schema.indexes().some(([fields]) => JSON.stringify(fields) === JSON.stringify(expectedFields));
}

test("models barrel compiles core model exports", () => {
  assert.equal(models.Folder.modelName, "Folder");
  assert.equal(models.Document.modelName, "Document");
  assert.equal(models.DocumentChunk.modelName, "DocumentChunk");
  assert.equal(models.ChatSession.modelName, "ChatSession");
  assert.equal(models.ChatMessage.modelName, "ChatMessage");
  assert.equal(models.UsageEvent.modelName, "UsageEvent");
  assert.equal(models.AiRoutingAttempt.modelName, "AiRoutingAttempt");
});

test("Folder schema has required paths, enums, defaults, and indexes", () => {
  assert.equal(Folder.schema.path("name").isRequired, true);
  assert.equal(Folder.schema.path("path").isRequired, true);
  assert.equal(Folder.schema.path("mockId").instance, "String");
  assert.equal(Folder.schema.path("manifestPath").instance, "String");
  assert.deepEqual(Folder.schema.path("scope").enumValues, FOLDER_SCOPES);
  assert.deepEqual(Folder.schema.path("lifecycleStatus").enumValues, LIFECYCLE_STATUSES);

  const folder = new Folder({
    demoSessionId: "demo_123",
    scope: FOLDER_SCOPE.USER,
    name: "Operations",
    path: "/Operations",
  });

  assert.equal(folder.readOnly, false);
  assert.equal(folder.documentCount, 0);
  assert.equal(folder.lifecycleStatus, LIFECYCLE_STATUS.ACTIVE);
  assert.equal(folder.validateSync(), undefined);

  assert.equal(hasIndex(Folder.schema, { demoSessionId: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(Folder.schema, { scope: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(Folder.schema, { parentFolderId: 1 }), true);
  assert.equal(hasIndex(Folder.schema, { path: 1 }), true);
  assert.equal(hasIndex(Folder.schema, { mockId: 1, scope: 1 }), true);
});

test("Folder enforces user session ownership and mock read-only convention", async () => {
  const userFolder = new Folder({
    scope: FOLDER_SCOPE.USER,
    name: "Missing session",
    path: "/Missing session",
  });

  const userError = userFolder.validateSync();
  assert.match(userError.errors.demoSessionId.message, /demo session/i);

  const mockFolder = new Folder({
    scope: FOLDER_SCOPE.MOCK,
    name: "Mock",
    path: "/Mock",
    readOnly: false,
  });

  await mockFolder.validate();
  assert.equal(mockFolder.readOnly, true);
});
