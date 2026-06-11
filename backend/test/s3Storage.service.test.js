import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.NODE_ENV = "test";
process.env.AWS_REGION = "";
process.env.AWS_S3_BUCKET = "";
process.env.AWS_ACCESS_KEY_ID = "";
process.env.AWS_SECRET_ACCESS_KEY = "";

const {
  deleteObject,
  deleteObjectsByPrefix,
  getObjectBuffer,
  getObjectText,
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

test("S3 getObjectBuffer requires configured storage", async () => {
  await assert.rejects(
    () =>
      getObjectBuffer({
        objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md",
      }),
    {
      statusCode: 503,
      code: "STORAGE_NOT_CONFIGURED",
    },
  );
});

test("S3 getObjectBuffer validates safe readable prefixes", async () => {
  const overrides = {
    configured: true,
    bucket: "centraldocs-test",
    client: {},
    sender: async () => ({ Body: Buffer.from("should-not-run") }),
  };

  for (const objectKey of [
    "../unsafe.md",
    "/demo-sessions/demo_123/uploads/upload_1/brief.md",
    "demo-sessions\\demo_123\\uploads\\upload_1\\brief.md",
    "other-prefix/doc.md",
  ]) {
    await assert.rejects(() => getObjectBuffer({ objectKey }, overrides), {
      code: "INVALID_STORAGE_KEY",
    });
  }
});

test("S3 getObjectBuffer allows CentralDocs prefixes and returns Buffer", async () => {
  const seen = [];
  for (const objectKey of [
    "demo-sessions/demo_123/uploads/upload_1/brief.md",
    "mock/orchid-retail/original/doc/report.md",
  ]) {
    const buffer = await getObjectBuffer(
      { objectKey },
      {
        configured: true,
        bucket: "centraldocs-test",
        client: { fake: true },
        sender: async (client, command) => {
          seen.push({ client, input: command.input });
          return { Body: Buffer.from("stored") };
        },
      },
    );

    assert.equal(buffer.toString("utf8"), "stored");
  }

  assert.equal(seen[0].input.Key, "demo-sessions/demo_123/uploads/upload_1/brief.md");
  assert.equal(seen[1].input.Key, "mock/orchid-retail/original/doc/report.md");
});

test("S3 getObjectBuffer handles stream-like fake bodies and text caps", async () => {
  const text = await getObjectText(
    { objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md", maxBytes: 5 },
    {
      configured: true,
      bucket: "centraldocs-test",
      client: {},
      sender: async () => ({ Body: Readable.from(["hello", " world"]) }),
    },
  );

  assert.equal(text, "hello");
});

test("S3 getObjectBuffer maps missing objects safely", async () => {
  await assert.rejects(
    () =>
      getObjectBuffer(
        { objectKey: "demo-sessions/demo_123/uploads/upload_1/missing.md" },
        {
          configured: true,
          bucket: "centraldocs-test",
          client: {},
          sender: async () => {
            const error = new Error("NoSuchKey with hidden details");
            error.name = "NoSuchKey";
            throw error;
          },
        },
      ),
    {
      statusCode: 404,
      code: "STORAGE_OBJECT_NOT_FOUND",
    },
  );
});

test("S3 deleteObject uses injected sender and validates object keys", async () => {
  let captured = null;
  const deleted = await deleteObject(
    { objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md" },
    {
      configured: true,
      bucket: "centraldocs-test",
      client: { fake: true },
      sender: async (client, command) => {
        captured = { client, input: command.input };
        return { $metadata: { requestId: "req-123" } };
      },
    },
  );

  assert.equal(deleted.deleted, true);
  assert.equal(deleted.requestId, "req-123");
  assert.equal(captured.input.Bucket, "centraldocs-test");
  assert.equal(captured.input.Key, "demo-sessions/demo_123/uploads/upload_1/brief.md");

  await assert.rejects(
    () =>
      deleteObject(
        { objectKey: "../unsafe.md" },
        {
          configured: true,
          bucket: "centraldocs-test",
          client: {},
          sender: async () => ({}),
        },
      ),
    { code: "INVALID_STORAGE_KEY" },
  );

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
