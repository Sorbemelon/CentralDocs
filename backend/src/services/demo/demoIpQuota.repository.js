import { isMongoConnected } from "../../db/connectMongo.js";
import { DemoQuotaWindow } from "../../models/index.js";

function toPlain(record) {
  return record?.toObject ? record.toObject() : record;
}

export function isDemoIpQuotaPersistenceAvailable() {
  return isMongoConnected();
}

export async function findActiveQuotaWindow({ identityHash, at = new Date() } = {}) {
  if (!identityHash || !isDemoIpQuotaPersistenceAvailable()) {
    return null;
  }

  return toPlain(
    await DemoQuotaWindow.findOne({
      identityHash,
      expiresAt: { $gt: at },
    })
      .sort({ windowStartedAt: -1 })
      .lean(),
  );
}

export async function createQuotaWindow(record) {
  if (!isDemoIpQuotaPersistenceAvailable()) {
    return null;
  }

  return toPlain(await DemoQuotaWindow.create(record));
}

export async function updateQuotaWindowUsage({ quotaWindowId, usage } = {}) {
  if (!quotaWindowId || !isDemoIpQuotaPersistenceAvailable()) {
    return null;
  }

  return DemoQuotaWindow.findByIdAndUpdate(
    quotaWindowId,
    { $set: { usage } },
    { returnDocument: "after", lean: true },
  );
}
