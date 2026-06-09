import { connectMongo, disconnectMongo } from "../db/connectMongo.js";
import { seedMockWorkspace } from "../services/mockData/mockSeed.service.js";

const dryRun = process.argv.includes("--dry-run");

try {
  await connectMongo();
  const summary = await seedMockWorkspace({ dryRun });
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        code: error.code || "MOCK_SEED_FAILED",
        message: error.message,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await disconnectMongo();
}
