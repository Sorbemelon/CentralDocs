import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
delete process.env.AWS_REGION;
delete process.env.AWS_S3_BUCKET;
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;

const {
  deleteObject,
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

test("reserved S3 upload/delete methods fail safely without AWS calls", async () => {
  for (const method of [putObject, deleteObject]) {
    await assert.rejects(() => method(), {
      statusCode: 501,
      code: "STORAGE_METHOD_NOT_IMPLEMENTED",
    });
  }

  resetS3StorageDependenciesForTests();
});
