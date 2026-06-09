import { pathToFileURL } from "node:url";
import { connectMongo, disconnectMongo } from "../db/connectMongo.js";
import { embedAllMockMediaDocuments } from "../services/mediaEmbedding/mockMediaEmbedding.service.js";

export function parseEmbedMockMediaArgs(argv = []) {
  const args = {
    dryRun: false,
    force: false,
    documentIdOrSlug: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--document") {
      args.documentIdOrSlug = argv[index + 1] || null;
      index += 1;
    }
  }

  return args;
}

export async function runEmbedMockMediaScript({
  argv = process.argv.slice(2),
  connector = connectMongo,
  disconnect = disconnectMongo,
  embedder = embedAllMockMediaDocuments,
  output = {
    write: (message) => process.stdout.write(message),
    writeError: (message) => process.stderr.write(message),
  },
} = {}) {
  const args = parseEmbedMockMediaArgs(argv);

  try {
    await connector();
    const summary = await embedder({
      dryRun: args.dryRun,
      force: args.force,
      documentIdOrSlug: args.documentIdOrSlug,
    });
    output.write(`${JSON.stringify(summary, null, 2)}\n`);
    return { exitCode: 0, summary };
  } catch (error) {
    const summary = {
      status: "failed",
      code: error.code || "MOCK_MEDIA_EMBEDDING_FAILED",
      message: "Mock media embedding failed.",
    };
    output.writeError(`${JSON.stringify(summary, null, 2)}\n`);
    return { exitCode: 1, summary };
  } finally {
    await disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runEmbedMockMediaScript();
  process.exitCode = result.exitCode;
}
