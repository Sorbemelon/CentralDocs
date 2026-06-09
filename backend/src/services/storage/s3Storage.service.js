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
  createStorageMethodNotImplementedError,
  createStorageNotConfiguredError,
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

export async function putObject() {
  void PutObjectCommand;
  throw createStorageMethodNotImplementedError("putObject");
}

export async function deleteObject() {
  void DeleteObjectCommand;
  throw createStorageMethodNotImplementedError("deleteObject");
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
