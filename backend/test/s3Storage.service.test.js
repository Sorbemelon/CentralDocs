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
} = await import("../src/services/storage/s3Storage.service.js");

test("S3 storage reports not_configured when env is missing", () => {
  const status = getStorageStatus();

  assert.equal(status.provider, "aws_s3");
  assert.equal(status.status, "not_configured");
  assert.equal(status.clientReady, false);
  assert.equal(status.liveUploadsEnabled, false);
  assert.deepEqual(status.presence, {
    region: false,
    bucket: false,
    accessKeyId: false,
    secretAccessKey: false,
  });
});

test("S3 skeleton methods fail safely without making AWS calls", async () => {
  for (const method of [getPresignedDownloadUrl, putObject, deleteObject]) {
    await assert.rejects(() => method(), {
      statusCode: 501,
      code: "STORAGE_METHOD_NOT_IMPLEMENTED",
    });
  }
});
