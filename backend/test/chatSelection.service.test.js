import { test } from "node:test";
import assert from "node:assert/strict";

const { resolveChatSelection } = await import("../src/services/chats/chatSelection.service.js");

const documents = [
  {
    id: "mock_doc",
    title: "Mock Brief",
    fileKind: "markdown",
    sourceType: "mock",
    scope: "mock",
    folderId: "mock_folder",
    folderName: "Mock Folder",
    status: "ready",
    lifecycleStatus: "active",
    demoSessionId: null,
  },
  {
    id: "user_doc",
    title: "User Upload",
    fileKind: "pdf",
    sourceType: "upload",
    scope: "user",
    folderId: "user_folder",
    folderName: "User Folder",
    status: "ready",
    lifecycleStatus: "active",
    demoSessionId: "demo_123",
  },
  {
    id: "generated_doc",
    title: "Generated Memo",
    fileKind: "markdown",
    sourceType: "generated",
    scope: "generated",
    folderId: "user_folder",
    folderName: "User Folder",
    status: "ready",
    lifecycleStatus: "active",
    demoSessionId: "demo_123",
  },
  {
    id: "trashed_doc",
    title: "Trashed",
    fileKind: "pdf",
    sourceType: "upload",
    scope: "user",
    folderId: "user_folder",
    status: "ready",
    lifecycleStatus: "trashed",
    demoSessionId: "demo_123",
  },
  {
    id: "failed_doc",
    title: "Failed",
    fileKind: "pdf",
    sourceType: "upload",
    scope: "user",
    folderId: "user_folder",
    status: "failed",
    lifecycleStatus: "active",
    demoSessionId: "demo_123",
  },
];

const folders = [
  {
    id: "mock_folder",
    name: "Mock Folder",
    scope: "mock",
    path: "/Mock Folder",
    readOnly: true,
    lifecycleStatus: "active",
  },
  {
    id: "user_folder",
    name: "User Folder",
    scope: "user",
    path: "/User Folder",
    readOnly: false,
    lifecycleStatus: "active",
    demoSessionId: "demo_123",
  },
  {
    id: "trashed_folder",
    name: "Trashed Folder",
    scope: "user",
    path: "/Trashed Folder",
    readOnly: false,
    lifecycleStatus: "trashed",
    demoSessionId: "demo_123",
  },
];

function repositories() {
  return {
    documentRepository: {
      listAttachableDocuments: async ({ demoSessionId, selectedDocumentIds, selectedFolderIds }) =>
        documents.filter((document) => {
          const visible = document.scope === "mock" || document.demoSessionId === demoSessionId;
          const selectedDirectly = selectedDocumentIds.includes(document.id);
          const resolvedFromFolder =
            selectedFolderIds.includes(document.folderId) &&
            document.status === "ready" &&
            document.lifecycleStatus === "active";
          return (
            visible &&
            (selectedDirectly || resolvedFromFolder)
          );
        }),
    },
    folderRepository: {
      listAttachableFolders: async ({ demoSessionId, selectedFolderIds }) =>
        folders.filter((folder) => {
          const visible = folder.scope === "mock" || folder.demoSessionId === demoSessionId;
          return visible && selectedFolderIds.includes(folder.id);
        }),
    },
  };
}

test("chat selection dedupes selected IDs and accepts mock/current-session documents", async () => {
  const selection = await resolveChatSelection({
    demoSessionId: "demo_123",
    selectedDocumentIds: ["mock_doc", "user_doc", "user_doc"],
    selectedFolderIds: ["mock_folder", "mock_folder"],
    repositories: repositories(),
  });

  assert.deepEqual(selection.selectedDocumentIds, ["mock_doc", "user_doc"]);
  assert.deepEqual(selection.selectedFolderIds, ["mock_folder"]);
  assert.equal(selection.attachedDocuments.length, 2);
  assert.equal(selection.attachedFolders[0].scope, "mock");
  assert.equal(selection.snapshots.attachedDocumentSnapshot[0].id, "mock_doc");
});

test("chat selection resolves folders to active ready document snapshots and dedupes mixed input", async () => {
  const selection = await resolveChatSelection({
    demoSessionId: "demo_123",
    selectedDocumentIds: ["user_doc"],
    selectedFolderIds: ["user_folder"],
    repositories: repositories(),
  });

  assert.deepEqual(
    selection.resolvedDocuments.map((document) => document.id),
    ["user_doc", "generated_doc"],
  );
  assert.deepEqual(selection.snapshots.resolvedDocumentSnapshot[0].resolvedFromFolderIds, [
    "user_folder",
  ]);
});

test("chat selection rejects trashed and not-ready selected documents", async () => {
  await assert.rejects(
    () =>
      resolveChatSelection({
        demoSessionId: "demo_123",
        selectedDocumentIds: ["trashed_doc"],
        repositories: repositories(),
      }),
    { code: "DOCUMENT_TRASHED" },
  );
  await assert.rejects(
    () =>
      resolveChatSelection({
        demoSessionId: "demo_123",
        selectedDocumentIds: ["failed_doc"],
        repositories: repositories(),
      }),
    { code: "DOCUMENT_NOT_READY" },
  );
});

test("chat selection rejects trashed folders and missing resources", async () => {
  await assert.rejects(
    () =>
      resolveChatSelection({
        demoSessionId: "demo_123",
        selectedFolderIds: ["trashed_folder"],
        repositories: repositories(),
      }),
    { code: "FOLDER_TRASHED" },
  );
  await assert.rejects(
    () =>
      resolveChatSelection({
        demoSessionId: "demo_123",
        selectedDocumentIds: ["missing_doc"],
        repositories: repositories(),
      }),
    { code: "DOCUMENT_NOT_FOUND" },
  );
});
