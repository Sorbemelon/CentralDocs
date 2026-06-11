import { test } from "node:test";
import assert from "node:assert/strict";

const {
  assertNonEmptySearchScope,
  resolveSearchScope,
} = await import("../src/services/search/searchScope.service.js");

const docs = [
  {
    _id: "mock_object",
    id: "mock_public",
    mockId: "mock_public",
    folderId: "507f1f77bcf86cd799439011",
    folderMockId: "folder_mock",
    folderName: "Mock Folder",
    scope: "mock",
    sourceType: "mock",
    title: "Mock Brief",
    fileKind: "markdown",
    status: "ready",
    lifecycleStatus: "active",
    demoSessionId: null,
  },
  {
    _id: "user_doc",
    folderId: "folder_user",
    folderName: "User Folder",
    scope: "user",
    sourceType: "upload",
    title: "User Upload",
    fileKind: "pdf",
    status: "ready",
    lifecycleStatus: "active",
    demoSessionId: "demo_123",
  },
  {
    _id: "generated_doc",
    folderId: "folder_user",
    folderName: "Generated Folder",
    scope: "generated",
    sourceType: "generated",
    title: "Generated Brief",
    fileKind: "markdown",
    status: "ready",
    lifecycleStatus: "active",
    demoSessionId: "demo_123",
  },
  {
    _id: "other_session",
    folderId: "folder_other",
    scope: "user",
    title: "Other Session",
    fileKind: "pdf",
    status: "ready",
    lifecycleStatus: "active",
    demoSessionId: "demo_other",
  },
  {
    _id: "trashed_doc",
    folderId: "folder_user",
    scope: "user",
    title: "Trashed",
    fileKind: "pdf",
    status: "ready",
    lifecycleStatus: "trashed",
    demoSessionId: "demo_123",
  },
  {
    _id: "failed_doc",
    folderId: "folder_user",
    scope: "user",
    title: "Failed",
    fileKind: "pdf",
    status: "failed",
    lifecycleStatus: "active",
    demoSessionId: "demo_123",
  },
];

function repository() {
  return {
    documentRepository: {
      listSearchableDocuments: async ({ demoSessionId, scopes }) =>
        docs.filter((doc) => doc.scope === "mock" || (doc.demoSessionId === demoSessionId && scopes.includes(doc.scope))),
    },
  };
}

function request(overrides = {}) {
  return {
    query: "risk",
    selectedDocumentIds: [],
    selectedFolderIds: [],
    scope: "all",
    fileKinds: [],
    topK: 6,
    ...overrides,
  };
}

test("search scope includes mock and current session user/generated docs", async () => {
  const scope = await resolveSearchScope({
    request: request(),
    demoSessionId: "demo_123",
    repositories: repository(),
  });

  assert.deepEqual(scope.resolvedDocumentIds, ["mock_object", "user_doc", "generated_doc"]);
  assert.equal(scope.searchedDocumentCount, 3);
});

test("search scope filters mock, user, and generated scopes", async () => {
  const mockScope = await resolveSearchScope({
    request: request({ scope: "mock" }),
    demoSessionId: "demo_123",
    repositories: repository(),
  });
  const userScope = await resolveSearchScope({
    request: request({ scope: "user" }),
    demoSessionId: "demo_123",
    repositories: repository(),
  });
  const generatedScope = await resolveSearchScope({
    request: request({ scope: "generated" }),
    demoSessionId: "demo_123",
    repositories: repository(),
  });

  assert.deepEqual(mockScope.resolvedDocumentIds, ["mock_object"]);
  assert.deepEqual(userScope.resolvedDocumentIds, ["user_doc"]);
  assert.deepEqual(generatedScope.resolvedDocumentIds, ["generated_doc"]);
});

test("search scope resolves selected documents and folders as a deduped union", async () => {
  const scope = await resolveSearchScope({
    request: request({
      selectedDocumentIds: ["user_doc", "mock_public"],
      selectedFolderIds: ["folder_user"],
    }),
    demoSessionId: "demo_123",
    repositories: repository(),
  });

  assert.deepEqual(scope.resolvedDocumentIds, ["mock_object", "user_doc", "generated_doc"]);
});

test("search scope resolves seeded mock documents by public folder ID", async () => {
  const scope = await resolveSearchScope({
    request: request({
      selectedFolderIds: ["folder_mock"],
      scope: "mock",
    }),
    demoSessionId: "demo_123",
    repositories: repository(),
  });

  assert.deepEqual(scope.resolvedDocumentIds, ["mock_object"]);
  assert.equal(scope.documents[0].folderId, "folder_mock");
});

test("search scope filters file kinds and excludes trashed, failed, and not-ready docs", async () => {
  const scope = await resolveSearchScope({
    request: request({ fileKinds: ["pdf"] }),
    demoSessionId: "demo_123",
    repositories: repository(),
  });

  assert.deepEqual(scope.resolvedDocumentIds, ["user_doc"]);
});

test("search scope empty selected scope returns safe error", async () => {
  const scope = await resolveSearchScope({
    request: request({ selectedDocumentIds: ["missing_doc"] }),
    demoSessionId: "demo_123",
    repositories: repository(),
  });

  assert.throws(() => assertNonEmptySearchScope(scope, request({ selectedDocumentIds: ["missing_doc"] })), {
    code: "SEARCH_SCOPE_EMPTY",
  });
});
