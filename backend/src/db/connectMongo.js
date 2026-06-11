import mongoose from "mongoose";
import {
  env,
  getMongoConnectionOptions,
  getMongoDatabaseWarning,
  getMongoUri,
} from "../config/env.js";

const READY_STATES = Object.freeze({
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
});

export function getMongoStatus() {
  if (!env.isMongoConfigured) {
    return "not_configured";
  }

  return READY_STATES[mongoose.connection.readyState] || "disconnected";
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectMongo() {
  if (!env.isMongoConfigured) {
    return {
      status: "not_configured",
      connected: false,
    };
  }

  if (isMongoConnected()) {
    return {
      status: "connected",
      connected: true,
    };
  }

  try {
    await mongoose.connect(getMongoUri(), {
      serverSelectionTimeoutMS: 5000,
      ...getMongoConnectionOptions(),
    });

    return {
      status: "connected",
      connected: true,
      warning: getMongoDatabaseWarning(),
    };
  } catch (error) {
    return {
      status: "disconnected",
      connected: false,
      reason: "connection_failed",
      warning: getMongoDatabaseWarning(),
    };
  }
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
