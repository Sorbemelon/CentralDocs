import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
delete process.env.AWS_REGION;
delete process.env.AWS_S3_BUCKET;
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;

const {
  deleteObject,
  deleteObjectsByPrefix,
  getPresignedDownloadUrl,
  getStorageStatus,
  putObject,
  resetS3StorageDependenciesForTests,
} = await import("../src/services/storage/s3Storage.service.js");

test("S3 storage reports not_configured when env is missing", () => {
  const status = getStorageStatus();

  assert.equal(status.configured, false);
  assert.equal(status.bucketConfigured, false);
  assert.equal(status.regionConfigured, false);
  assert.equal(status.credentialsConfigured, false);
  assert.deepEqual(Object.keys(status).sort(), [
    "bucketConfigured",
    "configured",
    "credentialsConfigured",
    "regionConfigured",
  ]);
  assert.equal("accessKeyId" in status, false);
  assert.equal("secretAccessKey" in status, false);
});

test("S3 storage rejects downloads when config is missing", async () => {
  await assert.rejects(
    () =>
      getPresignedDownloadUrl({
        objectKey: "mock/orchid-retail/original/doc/file.md",
        downloadFilename: "file.md",
      }),
    {
      statusCode: 503,
      code: "STORAGE_NOT_CONFIGURED",
    },
  );
});

test("S3 storage rejects unsafe object keys", async () => {
  await assert.rejects(
    () =>
      getPresignedDownloadUrl(
        {
          objectKey: "../unsafe.md",
          downloadFilename: "unsafe.md",
        },
        {
          configured: true,
          bucket: "centraldocs-test",
          client: {},
          presigner: async () => "https://should-not-be-called.example",
        },
      ),
    {
      statusCode: 400,
      code: "INVALID_STORAGE_KEY",
    },
  );
});

test("S3 storage clamps expiry and calls injected presigner", async () => {
  let captured = null;
  const result = await getPresignedDownloadUrl(
    {
      objectKey: "mock/orchid-retail/original/mock_doc/report.md",
      downloadFilename: "Quarterly Report.md",
      contentType: "text/markdown",
      expiresInSeconds: 1200,
    },
    {
      configured: true,
      bucket: "centraldocs-test",
      client: { fake: true },
      presigner: async (client, command, options) => {
        captured = { client, input: command.input, options };
        return "https://signed.example/report";
      },
    },
  );

  assert.equal(result.downloadUrl, "https://signed.example/report");
  assert.equal(result.expiresInSeconds, 900);
  assert.equal(result.filename, "Quarterly_Report.md");
  assert.equal(result.storageProvider, "s3");
  assert.equal(captured.client.fake, true);
  assert.equal(captured.input.Bucket, "centraldocs-test");
  assert.equal(captured.input.Key, "mock/orchid-retail/original/mock_doc/report.md");
  assert.equal(captured.input.ResponseContentType, "text/markdown");
  assert.equal(captured.options.expiresIn, 900);
});

test("S3 putObject requires configured storage", async () => {
  await assert.rejects(
    () =>
      putObject({
        objectKey: "mock/orchid-retail/original/mock_doc/report.md",
        body: Buffer.from("mock"),
        contentType: "text/markdown",
      }),
    {
      statusCode: 503,
      code: "STORAGE_NOT_CONFIGURED",
    },
  );
});

test("S3 putObject rejects unsafe object keys", async () => {
  await assert.rejects(
    () =>
      putObject(
        {
          objectKey: "mock/orchid-retail/../report.md",
          body: Buffer.from("mock"),
          contentType: "text/markdown",
        },
        {
          configured: true,
          bucket: "centraldocs-test",
          client: {},
          sender: async () => ({ ETag: "should-not-run" }),
        },
      ),
    {
      statusCode: 400,
      code: "INVALID_STORAGE_KEY",
    },
  );
});

test("S3 putObject uses injected sender and returns safe metadata", async () => {
  let captured = null;
  const result = await putObject(
    {
      objectKey: "mock/orchid-retail/original/mock_doc/report.md",
      body: Buffer.from("mock"),
      contentType: "text/markdown",
    },
    {
      configured: true,
      bucket: "centraldocs-test",
      client: { fake: true },
      sender: async (client, command) => {
        captured = { client, input: command.input };
        return { ETag: '"abc123"' };
      },
    },
  );

  assert.equal(result.objectKey, "mock/orchid-retail/original/mock_doc/report.md");
  assert.equal(result.bucketConfigured, true);
  assert.equal(result.etag, '"abc123"');
  assert.equal(captured.client.fake, true);
  assert.equal(captured.input.Bucket, "centraldocs-test");
  assert.equal(captured.input.Key, "mock/orchid-retail/original/mock_doc/report.md");
  assert.equal(captured.input.ContentType, "text/markdown");
});

test("reserved S3 delete method fails safely without AWS calls", async () => {
  await assert.rejects(() => deleteObject(), {
    statusCode: 501,
    code: "STORAGE_METHOD_NOT_IMPLEMENTED",
  });

  resetS3StorageDependenciesForTests();
});

test("S3 storage delete-by-prefix foundation only allows demo-session prefixes", async () => {
  await assert.rejects(() => deleteObjectsByPrefix({ prefix: "mock/orchid-retail/" }), {
    code: "INVALID_STORAGE_KEY",
  });

  const skipped = await deleteObjectsByPrefix({ prefix: "demo-sessions/demo_abc/" });
  assert.equal(skipped.status, "skipped_not_configured");

  const completed = await deleteObjectsByPrefix(
    { prefix: "demo-sessions/demo_abc/" },
    {
      configured: true,
      bucket: "centraldocs-test",
      client: {},
      prefixDeleter: async ({ prefix }) => ({ deletedCount: prefix.endsWith("/") ? 3 : 0 }),
    },
  );

  assert.equal(completed.status, "completed");
  assert.equal(completed.deletedCount, 3);
});
