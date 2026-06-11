import { env, getSafeConfigSummary } from "./config/env.js";
import { connectMongo, disconnectMongo } from "./db/connectMongo.js";
import { app } from "./app.js";

async function startServer() {
  const mongoResult = await connectMongo();

  if (mongoResult.status === "connected") {
    console.log("MongoDB configured and connected.");
  } else if (mongoResult.status === "not_configured") {
    console.log("MongoDB not configured; starting in degraded demo-foundation mode.");
  } else {
    console.warn("MongoDB configured but not connected; starting in degraded demo-foundation mode.");
  }
  if (mongoResult.warning) {
    console.warn(mongoResult.warning);
  }

  const server = app.listen(env.PORT, () => {
    const safeConfig = getSafeConfigSummary();
    console.log(`CentralDocs backend listening on port ${safeConfig.port}.`);
    console.log(
      `Config: mongodb=${safeConfig.mongodb}, s3=${safeConfig.s3}, gemini_keys=${safeConfig.geminiKeyCount}.`,
    );
  });

  async function shutdown(signal) {
    console.log(`${signal} received; shutting down CentralDocs backend.`);
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("CentralDocs backend failed to start.");
  process.exit(1);
});
