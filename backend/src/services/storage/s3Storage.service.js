import { createHttpError } from "../../utils/httpError.js";
import { getS3Client, getS3ConfigStatus, getS3Presence } from "./s3Client.js";

function phasePlaceholder(methodName) {
  throw createHttpError(
    501,
    `${methodName} is reserved for a later storage implementation phase.`,
    "STORAGE_METHOD_NOT_IMPLEMENTED",
  );
}

export function getStorageStatus() {
  return {
    provider: "aws_s3",
    status: getS3ConfigStatus(),
    presence: getS3Presence(),
    clientReady: Boolean(getS3Client()),
    liveUploadsEnabled: false,
  };
}

export async function getPresignedDownloadUrl() {
  return phasePlaceholder("getPresignedDownloadUrl");
}

export async function putObject() {
  return phasePlaceholder("putObject");
}

export async function deleteObject() {
  return phasePlaceholder("deleteObject");
}
