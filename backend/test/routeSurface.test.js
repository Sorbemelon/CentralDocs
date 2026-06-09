import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const routeRoot = path.resolve("src/routes");

async function readRoute(filename) {
  return fs.readFile(path.join(routeRoot, filename), "utf8");
}

function assertRoute(source, method, routePath) {
  assert.match(source, new RegExp(`\\.${method}\\(\\s*["']${routePath.replace(/\//g, "\\/")}["']`));
}

test("route surface exposes the expected backend API groups", async () => {
  const [health, demo, folders, documents, search, chats, trash, app] = await Promise.all([
    readRoute("health.routes.js"),
    readRoute("demo.routes.js"),
    readRoute("folder.routes.js"),
    readRoute("document.routes.js"),
    readRoute("search.routes.js"),
    readRoute("chat.routes.js"),
    readRoute("trash.routes.js"),
    fs.readFile(path.resolve("src/app.js"), "utf8"),
  ]);

  assertRoute(health, "get", "/");
  assertRoute(health, "get", "/warm");
  assertRoute(health, "get", "/dependencies");

  assertRoute(demo, "post", "/session");
  assertRoute(demo, "get", "/session");
  assertRoute(demo, "post", "/bootstrap");
  assertRoute(demo, "get", "/guide");
  assertRoute(demo, "post", "/clear");

  assertRoute(folders, "get", "/");
  assertRoute(folders, "post", "/");
  assertRoute(folders, "patch", "/:folderId");
  assertRoute(folders, "delete", "/:folderId");
  assertRoute(folders, "post", "/:folderId/restore");
  assertRoute(folders, "get", "/:folderId/documents");

  assertRoute(documents, "get", "/");
  assertRoute(documents, "get", "/:documentId");
  assertRoute(documents, "get", "/:documentId/preview");
  assertRoute(documents, "get", "/:documentId/status");
  assertRoute(documents, "post", "/upload");
  assertRoute(documents, "patch", "/:documentId/move");
  assertRoute(documents, "delete", "/:documentId");
  assertRoute(documents, "post", "/:documentId/restore");
  assertRoute(documents, "post", "/:documentId/retry");
  assertRoute(documents, "post", "/:documentId/download-url");

  assertRoute(trash, "get", "/");
  assertRoute(search, "post", "/semantic");

  assertRoute(chats, "get", "/");
  assertRoute(chats, "post", "/");
  assertRoute(chats, "get", "/:chatId");
  assertRoute(chats, "patch", "/:chatId");
  assertRoute(chats, "delete", "/:chatId");
  assertRoute(chats, "patch", "/:chatId/selection");
  assertRoute(chats, "post", "/:chatId/messages");
  assertRoute(chats, "post", "/:chatId/generated-documents");

  for (const mount of [
    "/api/health",
    "/api/demo",
    "/api/folders",
    "/api/documents",
    "/api/search",
    "/api/chats",
    "/api/trash",
  ]) {
    assert.ok(app.includes(`"${mount}"`));
  }
});

test("route source avoids unintended API expansion markers", async () => {
  const sources = await Promise.all([
    fs.readFile(path.resolve("src/app.js"), "utf8"),
    readRoute("document.routes.js"),
    readRoute("chat.routes.js"),
    fs.readFile(path.resolve("src/middleware/uploadMiddleware.js"), "utf8"),
  ]);
  const joined = sources.join("\n");

  assert.equal(joined.includes(".arr" + "ay("), false);
  assert.equal(joined.includes("upload" + ".arr" + "ay"), false);
  assert.equal(joined.includes("/api/documents/uploads"), false);
  assert.equal(joined.includes("/export/pdf"), false);
  assert.equal(joined.includes("/export/docx"), false);
  assert.equal(joined.includes("/commands"), false);
});
