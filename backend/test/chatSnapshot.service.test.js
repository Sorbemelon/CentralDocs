import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildChatSnapshots,
  toAttachedDocumentSnapshot,
  toAttachedFolderSnapshot,
  toResolvedDocumentSnapshot,
} = await import("../src/services/chats/chatSnapshot.service.js");

test("chat snapshots include safe frontend-ready document and folder fields", () => {
  const document = {
    id: "mock_document_brief",
    title: "Transformation Brief",
    fileKind: "markdown",
    sourceType: "mock",
    scope: "mock",
    folderId: "mock_folder_strategy",
    folderName: "Strategy",
    status: "ready",
    lifecycleStatus: "active",
    objectKey: "mock/workspace/original/secret.md",
    embedding: [0.1],
    localPath: "C:/secret/file.md",
    resolvedFromFolderIds: ["mock_folder_strategy"],
  };
  const folder = {
    id: "mock_folder_strategy",
    name: "Strategy",
    scope: "mock",
    path: "/Strategy",
    readOnly: true,
    lifecycleStatus: "active",
    objectKey: "mock/folder/key",
  };

  assert.deepEqual(toAttachedDocumentSnapshot(document), {
    id: "mock_document_brief",
    title: "Transformation Brief",
    fileKind: "markdown",
    sourceType: "mock",
    scope: "mock",
    folderId: "mock_folder_strategy",
    folderName: "Strategy",
    status: "ready",
    lifecycleStatus: "active",
  });
  assert.deepEqual(toAttachedFolderSnapshot(folder), {
    id: "mock_folder_strategy",
    name: "Strategy",
    scope: "mock",
    path: "/Strategy",
    readOnly: true,
    lifecycleStatus: "active",
  });
  assert.deepEqual(toResolvedDocumentSnapshot(document).resolvedFromFolderIds, [
    "mock_folder_strategy",
  ]);

  const snapshots = buildChatSnapshots({
    attachedDocuments: [document],
    attachedFolders: [folder],
    resolvedDocuments: [document],
  });
  const serialized = JSON.stringify(snapshots);

  assert.equal(serialized.includes("objectKey"), false);
  assert.equal(serialized.includes("embedding"), false);
  assert.equal(serialized.includes("localPath"), false);
});
