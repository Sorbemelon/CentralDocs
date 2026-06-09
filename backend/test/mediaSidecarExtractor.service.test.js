import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { extractMediaSidecar } = await import(
  "../src/services/extraction/mediaSidecarExtractor.service.js"
);
const { loadMockManifest } = await import("../src/services/mockData/mockManifest.service.js");

test("media sidecar extractor uses audio transcript sidecar", async () => {
  const manifest = await loadMockManifest();
  const document = manifest.documents.find((candidate) => candidate.filename.endsWith(".mp3"));
  const result = await extractMediaSidecar({ document, manifest });

  assert.equal(result.fileKind, "audio");
  assert.match(result.optimizedText, /risk/i);
  assert.ok(result.sourceBlocks.length > 0);
  assert.ok(
    result.sourceBlocks.some(
      (block) => block.metadata.directMultimodalEmbeddingSeeded === true,
    ),
  );
});

test("media sidecar extractor uses video notes sidecar", async () => {
  const manifest = await loadMockManifest();
  const document = manifest.documents.find((candidate) => candidate.filename.endsWith(".mp4"));
  const result = await extractMediaSidecar({ document, manifest });

  assert.equal(result.fileKind, "video");
  assert.match(result.optimizedText, /training/i);
  assert.ok(result.sourceBlocks.length > 0);
});

test("media sidecar extractor uses image manifest description without OCR", async () => {
  const manifest = await loadMockManifest();
  const document = manifest.documents.find((candidate) => candidate.fileKind === "image");
  const result = await extractMediaSidecar({ document, manifest });

  assert.equal(result.fileKind, "image");
  assert.match(result.optimizedText, /workflow|document intake|AI search/i);
  assert.equal(result.warnings[0].code, "MEDIA_MANIFEST_DESCRIPTION_ONLY");
  assert.equal(result.sourceBlocks[0].metadata.directMultimodalEmbeddingSeeded, true);
});

test("media sidecar extractor returns safe error when no sidecar or description exists", async () => {
  await assert.rejects(
    () =>
      extractMediaSidecar({
        document: {
          filename: "empty.mp3",
          folderSlug: "05-meeting-evidence",
          fileKind: "audio",
        },
        manifest: { documents: [] },
      }),
    {
      statusCode: 404,
      code: "MEDIA_SIDECAR_NOT_FOUND",
    },
  );
});
