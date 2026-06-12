import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "";

const {
  buildUniqueFolderName,
  createFolder,
  listFolderDocuments,
  listFolders,
  renameFolder,
} = await import("../src/services/folders/folder.service.js");
const { toFolderDto } = await import("../src/services/folders/folder.dto.js");
const { toMockFolderId } = await import("../src/utils/ids.js");

const strategyFolderId = toMockFolderId("01-strategy-rollout");

test("folder service lists deterministic read-only mock folders", async () => {
  const result = await listFolders({ query: { scope: "mock" } });

  assert.equal(result.persistenceStatus, "not_configured");
  assert.equal(result.folders.length, 6);
  assert.equal(result.folders[0].scope, "mock");
  assert.equal(result.folders[0].readOnly, true);
  assert.ok(result.folders.some((folder) => folder.id === strategyFolderId));
});

test("folder service returns mock documents for a mock folder", async () => {
  const result = await listFolderDocuments({ folderId: strategyFolderId });

  assert.equal(result.folder.id, strategyFolderId);
  assert.equal(result.documents.length, 3);
  assert.ok(result.documents.every((document) => document.folderId === strategyFolderId));
});

test("folder write service requires persistence and rejects mock edits", async () => {
  await assert.rejects(
    () => createFolder({ demoSessionId: "demo_test", name: "New Folder" }),
    { code: "PERSISTENCE_NOT_CONFIGURED", statusCode: 503 },
  );

  await assert.rejects(
    () => renameFolder({ folderId: strategyFolderId, demoSessionId: "demo_test", name: "New" }),
    { code: "READ_ONLY_RESOURCE", statusCode: 403 },
  );
});

test("folder creation helper builds unique sibling names", () => {
  assert.equal(buildUniqueFolderName("New folder", []), "New folder");
  assert.equal(buildUniqueFolderName("New folder", ["New folder"]), "New folder (2)");
  assert.equal(
    buildUniqueFolderName("New folder", ["New folder", "New folder (2)", "New folder (3)"]),
    "New folder (4)",
  );
  assert.equal(buildUniqueFolderName("New folder", ["new folder"]), "New folder (2)");
});

test("folder creation helper keeps numbered names within max length", () => {
  const longName = "A".repeat(120);
  const unique = buildUniqueFolderName(longName, [longName]);

  assert.equal(unique.length, 120);
  assert.match(unique, / \(2\)$/);
});

test("folder DTO hides raw internals", () => {
  const dto = toFolderDto({
    _id: "folder_1",
    name: "Private Folder",
    parentFolderId: null,
    path: "/Private Folder",
    scope: "user",
    readOnly: false,
    lifecycleStatus: "active",
    documentCount: 2,
    __v: 0,
  });

  assert.equal(dto.id, "folder_1");
  assert.ok(!("_id" in dto));
  assert.ok(!("__v" in dto));
});
