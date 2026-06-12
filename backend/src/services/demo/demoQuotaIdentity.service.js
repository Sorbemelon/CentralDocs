import crypto from "node:crypto";
import { getDemoIpHashSecret, isDemoIpQuotaEnabled } from "../../config/env.js";

function stripIpv6MappedPrefix(value = "") {
  return value.startsWith("::ffff:") ? value.slice("::ffff:".length) : value;
}

export function normalizeClientIp(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const withoutMappedPrefix = stripIpv6MappedPrefix(raw);
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(withoutMappedPrefix)) {
    return withoutMappedPrefix.slice(0, withoutMappedPrefix.lastIndexOf(":"));
  }

  return withoutMappedPrefix;
}

export function getClientIpFromRequest(req = {}) {
  if (Array.isArray(req.ips) && req.ips.length > 0) {
    return normalizeClientIp(req.ips[0]);
  }

  return normalizeClientIp(
    req.ip ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      null,
  );
}

export function hashClientIp(clientIp, secret = getDemoIpHashSecret()) {
  const normalizedIp = normalizeClientIp(clientIp);
  if (!normalizedIp || !secret) {
    return null;
  }

  return crypto
    .createHmac("sha256", secret)
    .update(normalizedIp)
    .digest("hex");
}

export function buildDemoQuotaIdentityFromRequest(req = {}) {
  if (!isDemoIpQuotaEnabled()) {
    return {
      enabled: false,
      identityHash: null,
      reason: "disabled",
    };
  }

  const clientIp = getClientIpFromRequest(req);
  const identityHash = hashClientIp(clientIp);
  if (!identityHash) {
    return {
      enabled: false,
      identityHash: null,
      reason: "client_ip_unavailable",
    };
  }

  return {
    enabled: true,
    identityHash,
    source: Array.isArray(req.ips) && req.ips.length > 0 ? "trusted_proxy" : "request_ip",
  };
}
