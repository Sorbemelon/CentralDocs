import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DEFAULT_DOWNLOAD_URL_EXPIRES_SECONDS,
  MAX_DOWNLOAD_URL_EXPIRES_SECONDS,
  STORAGE_PROVIDER_VALUE,
} from "./storage.constants.js";
import { getS3BucketName, getS3Client, getS3ConfigStatus, getS3Presence } from "./s3Client.js";
import { assertSafeObjectKey, sanitizeFilename } from "./s3ObjectKeys.js";
import {
  createInvalidStorageKeyError,
  createStorageMethodNotImplementedError,
  createStorageNotConfiguredError,
  createStorageObjectNotFoundError,
  createStorageReadFailedError,
} from "./storageErrors.js";

let testOverrides = {};

export function getStorageStatus() {
  return getS3Presence();
}

function resolveDependencies(overrides = {}) {
  return {
    client: overrides.client ?? testOverrides.client ?? getS3Client(),
    bucket: overrides.bucket ?? testOverrides.bucket ?? getS3BucketName(),
    configured: overrides.configured ?? testOverrides.configured ?? getS3ConfigStatus() === "configured",
    presigner: overrides.presigner ?? testOverrides.presigner ?? getSignedUrl,
    sender: overrides.sender ?? testOverrides.sender ?? null,
    prefixDeleter: overrides.prefixDeleter ?? testOverrides.prefixDeleter ?? null,
  };
}

function clampExpiry(expiresInSeconds) {
  const parsed = Number(expiresInSeconds);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DOWNLOAD_URL_EXPIRES_SECONDS;
  }

  return Math.min(Math.trunc(parsed), MAX_DOWNLOAD_URL_EXPIRES_SECONDS);
}

function buildContentDisposition(filename) {
  const safeFilename = sanitizeFilename(filename);
  return {
    safeFilename,
    value: `attachment; filename="${safeFilename}"`,
  };
}

export function assertSafeReadableObjectKey({ objectKey } = {}) {
  const safeObjectKey = assertSafeObjectKey(objectKey);
  if (!safeObjectKey.startsWith("mock/") && !safeObjectKey.startsWith("demo-sessions/")) {
    throw createInvalidStorageKeyError("Only CentralDocs storage prefixes can be read.");
  }

  return safeObjectKey;
}

function createDefaultSender(client) {
  if (typeof client?.send !== "function") {
    return null;
  }

  return (resolvedClient, commandToSend) => resolvedClient.send(commandToSend);
}

function isNotFoundStorageError(error) {
  return (
    error?.code === "NoSuchKey" ||
    error?.name === "NoSuchKey" ||
    error?.name === "NotFound" ||
    error?.$metadata?.httpStatusCode === 404 ||
    error?.statusCode === 404
  );
}

async function bodyToBuffer(body) {
  if (!body) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  if (typeof body === "string") {
    return Buffer.from(body);
  }
  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }
  if (typeof body.arrayBuffer === "function") {
    return Buffer.from(await body.arrayBuffer());
  }
  if (typeof body[Symbol.asyncIterator] === "function") {
    const chunks = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw createStorageReadFailedError("Stored object body could not be read safely.");
}

export function assertStorageConfigured(overrides = {}) {
  const dependencies = resolveDependencies(overrides);
  if (!dependencies.configured || !dependencies.client || !dependencies.bucket) {
    throw createStorageNotConfiguredError();
  }

  return dependencies;
}

export async function getPresignedDownloadUrl(
  {
    objectKey,
    downloadFilename,
    contentType,
    expiresInSeconds = DEFAULT_DOWNLOAD_URL_EXPIRES_SECONDS,
  } = {},
  overrides = {},
) {
  const dependencies = assertStorageConfigured(overrides);
  const safeObjectKey = assertSafeObjectKey(objectKey);
  const expiry = clampExpiry(expiresInSeconds);
  const disposition = buildContentDisposition(downloadFilename || "download");
  const command = new GetObjectCommand({
    Bucket: dependencies.bucket,
    Key: safeObjectKey,
    ResponseContentDisposition: disposition.value,
    ...(contentType ? { ResponseContentType: contentType } : {}),
  });

  const downloadUrl = await dependencies.presigner(dependencies.client, command, {
    expiresIn: expiry,
  });

  return {
    downloadUrl,
    expiresInSeconds: expiry,
    filename: disposition.safeFilename,
    storageProvider: STORAGE_PROVIDER_VALUE,
  };
}

export async function putObject({ objectKey, body, contentType } = {}, overrides = {}) {
  const dependencies = assertStorageConfigured(overrides);
  const safeObjectKey = assertSafeObjectKey(objectKey);
  const command = new PutObjectCommand({
    Bucket: dependencies.bucket,
    Key: safeObjectKey,
    Body: body,
    ...(contentType ? { ContentType: contentType } : {}),
  });
  const sender = dependencies.sender || createDefaultSender(dependencies.client);

  if (!sender) {
    throw createStorageMethodNotImplementedError("putObject");
  }

  const result = await sender(dependencies.client, command);

  return {
    objectKey: safeObjectKey,
    bucketConfigured: true,
    etag: result?.ETag || result?.etag || null,
  };
}

export async function getObjectBuffer({ objectKey } = {}, overrides = {}) {
  const dependencies = assertStorageConfigured(overrides);
  const safeObjectKey = assertSafeReadableObjectKey({ objectKey });
  const command = new GetObjectCommand({
    Bucket: dependencies.bucket,
    Key: safeObjectKey,
  });
  const sender = dependencies.sender || createDefaultSender(dependencies.client);

  if (!sender) {
    throw createStorageMethodNotImplementedError("getObjectBuffer");
  }

  try {
    const result = await sender(dependencies.client, command);
    return await bodyToBuffer(result?.Body);
  } catch (error) {
    if (isNotFoundStorageError(error)) {
      throw createStorageObjectNotFoundError();
    }
    if (error?.code === "INVALID_STORAGE_KEY" || error?.code === "STORAGE_NOT_CONFIGURED") {
      throw error;
    }
    throw createStorageReadFailedError();
  }
}

export async function getObjectText({ objectKey, maxBytes } = {}, overrides = {}) {
  const buffer = await getObjectBuffer({ objectKey }, overrides);
  const limit = Number(maxBytes);
  const readable = Number.isFinite(limit) && limit > 0 ? buffer.subarray(0, limit) : buffer;

  return readable.toString("utf8");
}

export async function deleteObject({ objectKey } = {}, overrides = {}) {
  const dependencies = assertStorageConfigured(overrides);
  const safeObjectKey = assertSafeObjectKey(objectKey);
  const command = new DeleteObjectCommand({
    Bucket: dependencies.bucket,
    Key: safeObjectKey,
  });
  const sender = dependencies.sender || createDefaultSender(dependencies.client);

  if (!sender) {
    throw createStorageMethodNotImplementedError("deleteObject");
  }

  const result = await sender(dependencies.client, command);

  return {
    objectKey: safeObjectKey,
    deleted: true,
    bucketConfigured: true,
    requestId: result?.$metadata?.requestId || null,
  };
}

export async function deleteObjectsByPrefix({ prefix } = {}, overrides = {}) {
  if (
    !prefix ||
    !prefix.startsWith("demo-sessions/") ||
    prefix.includes("..") ||
    prefix.includes("\\") ||
    prefix.startsWith("/")
  ) {
    throw createInvalidStorageKeyError("Only safe demo-session S3 prefixes can be cleaned up.");
  }
  if (prefix.startsWith("mock/")) {
    throw createInvalidStorageKeyError("Mock S3 prefixes cannot be cleaned up by demo sessions.");
  }

  const dependencies = resolveDependencies(overrides);
  if (!dependencies.configured || !dependencies.client || !dependencies.bucket) {
    return {
      status: "skipped_not_configured",
      prefix,
      deletedCount: 0,
    };
  }
  if (!dependencies.prefixDeleter) {
    return {
      status: "skipped_no_objects",
      prefix,
      deletedCount: 0,
    };
  }

  const result = await dependencies.prefixDeleter({
    prefix,
    client: dependencies.client,
    bucket: dependencies.bucket,
  });

  return {
    status: "completed",
    prefix,
    deletedCount: result?.deletedCount || 0,
  };
}

export function setS3StorageDependenciesForTests(overrides = {}) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("S3 storage dependency overrides are only available in tests.");
  }

  testOverrides = { ...testOverrides, ...overrides };
}

export function resetS3StorageDependenciesForTests() {
  testOverrides = {};
}
