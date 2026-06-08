import { S3Client } from "@aws-sdk/client-s3";
import { env, getS3Config } from "../../config/env.js";

let cachedClient = null;

export function getS3ConfigStatus() {
  return env.isS3Configured ? "configured" : "not_configured";
}

export function getS3Presence() {
  return env.s3Presence;
}

export function getS3Client() {
  const config = getS3Config();
  if (!config) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      credentials: config.credentials,
    });
  }

  return cachedClient;
}

export function getS3BucketName() {
  const config = getS3Config();
  return config?.bucket || null;
}
