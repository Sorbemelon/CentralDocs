import { pathToFileURL } from "node:url";
import { connectMongo, disconnectMongo } from "../db/connectMongo.js";
import { indexMockWorkspaceDocuments } from "../services/indexing/mockDocumentIndexing.service.js";

export function parseIndexMockArgs(argv = []) {
  const args = {
    dryRun: false,
    documentIdOrSlug: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--document") {
      args.documentIdOrSlug = argv[index + 1] || null;
      index += 1;
    }
  }

  return args;
}

export async function runIndexMockWorkspaceScript({
  argv = process.argv.slice(2),
  connector = connectMongo,
  disconnect = disconnectMongo,
  indexer = indexMockWorkspaceDocuments,
  logger = console,
} = {}) {
  const args = parseIndexMockArgs(argv);

  try {
    await connector();
    const summary = await indexer({
      dryRun: args.dryRun,
      documentIdOrSlug: args.documentIdOrSlug,
    });
    logger.log(JSON.stringify(summary, null, 2));
    return { exitCode: 0, summary };
  } catch (error) {
    const summary = {
      status: "failed",
      code: error.code || "INDEX_MOCK_WORKSPACE_FAILED",
      message: error.message,
    };
    logger.error(JSON.stringify(summary, null, 2));
    return { exitCode: 1, summary };
  } finally {
    await disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runIndexMockWorkspaceScript();
  process.exitCode = result.exitCode;
}
