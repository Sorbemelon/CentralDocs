import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  buildMockDocumentUpsertPayloads,
  buildMockFolderUpsertPayloads,
  upsertMockWorkspace,
} = await import("../src/services/mockData/mockSeed.repository.js");
const { toMockDocumentId, toMockFolderId } = await import("../src/utils/ids.js");

const fixtureManifest = {
  folders: [{ slug: "01-strategy-rollout", title: "Strategy & Rollout" }],
  documents: [
    {
      folderSlug: "01-strategy-rollout",
      folderTitle: "Strategy & Rollout",
      filename: "brief.md",
      title: "Brief",
      fileKind: "markdown",
      mimeType: "text/markdown",
      sourceType: "mock",
      scope: "mock",
      demoQuestions: ["What is the brief?"],
      relativePath: "documents/01-strategy-rollout/brief.md",
      sha256: "sha",
    },
  ],
};

const fixtureAsset = {
  mockId: toMockDocumentId("01-strategy-rollout/brief.md"),
  folderMockId: toMockFolderId("01-strategy-rollout"),
  filename: "brief.md",
  fileExtension: "md",
  mimeType: "text/markdown",
  objectKey:
    "mock/orchid-retail/original/mock_document_01_strategy_rollout_brief_md/brief.md",
  sizeBytes: 128,
  manifestPath: "documents/01-strategy-rollout/brief.md",
  description: "Topics: pilot.",
  mediaMeta: null,
};

test("mock seed repository builds read-only mock folder upsert payloads", () => {
  const [payload] = buildMockFolderUpsertPayloads(fixtureManifest);
  const update = payload.update.$set;

  assert.deepEqual(payload.filter, {
    mockId: toMockFolderId("01-strategy-rollout"),
    scope: "mock",
  });
  assert.equal(update.demoSessionId, null);
  assert.equal(update.scope, "mock");
  assert.equal(update.readOnly, true);
  assert.equal(update.lifecycleStatus, "active");
  assert.equal(update.documentCount, 1);
  assert.equal(update.path, "/Strategy & Rollout");
});

test("mock seed repository builds read-only mock document upsert payloads", () => {
  const folderIdByMockId = new Map([[fixtureAsset.folderMockId, "folder_object_id"]]);
  const [payload] = buildMockDocumentUpsertPayloads({
    manifest: fixtureManifest,
    assets: [fixtureAsset],
    folderIdByMockId,
  });
  const update = payload.update.$set;

  assert.deepEqual(payload.filter, {
    mockId: fixtureAsset.mockId,
    scope: "mock",
  });
  assert.equal(update.demoSessionId, null);
  assert.equal(update.scope, "mock");
  assert.equal(update.sourceType, "mock");
  assert.equal(update.readOnly, true);
  assert.equal(update.lifecycleStatus, "active");
  assert.equal(update.status, "ready");
  assert.equal(update.storageProvider, "s3");
  assert.equal(update.objectKey, fixtureAsset.objectKey);
  assert.equal(update.folderId, "folder_object_id");
  assert.equal(update.folderMockId, fixtureAsset.folderMockId);
  assert.deepEqual(update.demoQuestions, ["What is the brief?"]);
});

test("mock seed repository preserves cached media metadata only", () => {
  const mediaAsset = {
    ...fixtureAsset,
    mediaMeta: {
      directMultimodalEmbeddingSeeded: true,
      transcriptDocumentId: null,
      durationSeconds: null,
    },
  };
  const [payload] = buildMockDocumentUpsertPayloads({
    manifest: fixtureManifest,
    assets: [mediaAsset],
    folderIdByMockId: new Map([[mediaAsset.folderMockId, "folder_object_id"]]),
  });

  assert.equal(payload.update.$set.mediaMeta.directMultimodalEmbeddingSeeded, true);
});

test("mock seed repository skips upsert when persistence is unavailable", async () => {
  const result = await upsertMockWorkspace({
    manifest: fixtureManifest,
    assets: [fixtureAsset],
  });

  assert.equal(result.status, "skipped_not_configured");
  assert.equal(result.configured, false);
  assert.equal(result.upsertedFolders, 0);
  assert.equal(result.upsertedDocuments, 0);
});
