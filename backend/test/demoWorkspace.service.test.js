import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

const {
  buildDemoWorkspace,
  findMockDocumentById,
  findMockFolderById,
  listMockDocuments,
} = await import("../src/services/demo/demoWorkspace.service.js");
const { toMockDocumentId, toMockFolderId } = await import("../src/utils/ids.js");

const strategyFolderId = toMockFolderId("01-strategy-rollout");
const briefDocumentId = toMockDocumentId(
  "01-strategy-rollout/centraldocs-transformation-brief.md",
);

test("demo workspace service builds stable mock IDs and counts", async () => {
  const first = await buildDemoWorkspace();
  const second = await buildDemoWorkspace();

  assert.equal(first.source, "manifest");
  assert.equal(first.seeded, false);
  assert.equal(first.mockWorkspace.source, "manifest");
  assert.equal(first.mockWorkspace.seeded, false);
  assert.equal(first.mockWorkspace.documentsDownloadable, false);
  assert.equal(first.workspaceTitle, "Orchid Retail Digital Transformation");
  assert.equal(first.counts.folders, 6);
  assert.equal(first.counts.documents, 16);
  assert.deepEqual(
    first.folders.map((folder) => folder.id),
    second.folders.map((folder) => folder.id),
  );
  assert.ok(first.folders.some((folder) => folder.id === strategyFolderId));
  assert.ok(first.documents.some((document) => document.id === briefDocumentId));
});

test("demo workspace service marks all mock resources read-only and active", async () => {
  const workspace = await buildDemoWorkspace();

  assert.ok(workspace.folders.every((folder) => folder.readOnly === true));
  assert.ok(workspace.folders.every((folder) => folder.lifecycleStatus === "active"));
  assert.ok(workspace.documents.every((document) => document.readOnly === true));
  assert.ok(workspace.documents.every((document) => document.lifecycleStatus === "active"));
  assert.ok(workspace.documents.every((document) => document.downloadAvailable === "pending_seed"));
});

test("demo workspace lookup and filters work for mock resources", async () => {
  const folder = await findMockFolderById(strategyFolderId);
  const document = await findMockDocumentById(briefDocumentId);
  const mediaDocuments = await listMockDocuments({ fileKind: "audio" });

  assert.equal(folder.name, "Strategy & Rollout");
  assert.equal(document.title, "CentralDocs Transformation Brief");
  assert.equal(mediaDocuments.length, 1);
  assert.equal(mediaDocuments[0].mediaMeta.directMultimodalEmbeddingSeeded, true);
});

test("demo workspace can report persistent seeded mock records", async () => {
  const workspace = await buildDemoWorkspace({
    seedRepository: {
      listSeededMockWorkspace: async () => ({
        folders: [
          {
            mockId: strategyFolderId,
            name: "Strategy & Rollout",
            path: "/Strategy & Rollout",
            scope: "mock",
            readOnly: true,
            lifecycleStatus: "active",
            documentCount: 1,
          },
        ],
        documents: [
          {
            mockId: briefDocumentId,
            title: "CentralDocs Transformation Brief",
            originalFilename: "centraldocs-transformation-brief.md",
            downloadFilename: "centraldocs-transformation-brief.md",
            fileExtension: "md",
            mimeType: "text/markdown",
            fileKind: "markdown",
            scope: "mock",
            sourceType: "mock",
            readOnly: true,
            status: "ready",
            lifecycleStatus: "active",
            sizeBytes: 1704,
            objectKey:
              "mock/orchid-retail/original/mock_document_01_strategy_rollout_centraldocs_transformation_brief_md/centraldocs-transformation-brief.md",
          },
        ],
      }),
    },
  });

  assert.equal(workspace.source, "persistent");
  assert.equal(workspace.seeded, true);
  assert.equal(workspace.mockWorkspace.source, "persistent");
  assert.equal(workspace.mockWorkspace.seeded, true);
  assert.equal(workspace.mockWorkspace.documentsDownloadable, true);
  assert.equal(workspace.documents[0].downloadAvailable, true);
  assert.equal("objectKey" in workspace.documents[0], false);
});
