import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const { DOCUMENT_SCOPE, DOCUMENT_STATUS } = await import("../src/constants/document.constants.js");
const { LIFECYCLE_STATUS } = await import("../src/constants/lifecycle.constants.js");
const {
  activeOnlyFilter,
  buildRestorePatch,
  buildSoftDeletePatch,
  canSoftDeleteByDemoAction,
  excludeTrashedFilter,
  isActiveLifecycle,
  isTrashedLifecycle,
  shouldExcludeFromRetrieval,
} = await import("../src/services/lifecycle/softDelete.service.js");

test("soft delete patch marks lifecycle trashed and records deletion fields", () => {
  const deletedAt = new Date("2026-06-09T00:00:00.000Z");
  const originalFolderIdBeforeDelete = new mongoose.Types.ObjectId();

  const patch = buildSoftDeletePatch({
    demoSessionId: "demo_123",
    deleteOperationId: "delete_123",
    now: deletedAt,
    originalFolderIdBeforeDelete,
  });

  assert.equal(patch.lifecycleStatus, LIFECYCLE_STATUS.TRASHED);
  assert.equal(patch.deletedAt, deletedAt);
  assert.equal(patch.deletedByDemoSessionId, "demo_123");
  assert.equal(patch.deleteOperationId, "delete_123");
  assert.equal(patch.originalFolderIdBeforeDelete, originalFolderIdBeforeDelete);
});

test("restore patch marks lifecycle active and clears deletion fields", () => {
  const restoreFolderId = new mongoose.Types.ObjectId();
  const patch = buildRestorePatch({ restoreFolderId });

  assert.equal(patch.lifecycleStatus, LIFECYCLE_STATUS.ACTIVE);
  assert.equal(patch.deletedAt, null);
  assert.equal(patch.deletedByDemoSessionId, null);
  assert.equal(patch.deleteOperationId, null);
  assert.equal(patch.originalFolderIdBeforeDelete, null);
  assert.equal(patch.restoreParentFolderId, restoreFolderId);
});

test("lifecycle helpers identify and filter active records", () => {
  assert.equal(isActiveLifecycle({ lifecycleStatus: LIFECYCLE_STATUS.ACTIVE }), true);
  assert.equal(isTrashedLifecycle({ lifecycleStatus: LIFECYCLE_STATUS.TRASHED }), true);
  assert.deepEqual(activeOnlyFilter({ demoSessionId: "demo_123" }), {
    demoSessionId: "demo_123",
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  });
  assert.deepEqual(excludeTrashedFilter({ scope: DOCUMENT_SCOPE.USER }), {
    scope: DOCUMENT_SCOPE.USER,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  });
});

test("retrieval exclusion handles trashed, failed, and non-ready documents", () => {
  assert.equal(shouldExcludeFromRetrieval({ lifecycleStatus: LIFECYCLE_STATUS.TRASHED }), true);
  assert.equal(
    shouldExcludeFromRetrieval({
      lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
      status: DOCUMENT_STATUS.FAILED,
    }),
    true,
  );
  assert.equal(
    shouldExcludeFromRetrieval({
      lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
      status: DOCUMENT_STATUS.UPLOADED,
    }),
    true,
  );
  assert.equal(
    shouldExcludeFromRetrieval({
      lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
      status: DOCUMENT_STATUS.READY,
    }),
    false,
  );
});

test("mock or read-only records are not normal user soft-delete candidates", () => {
  assert.equal(canSoftDeleteByDemoAction({ scope: DOCUMENT_SCOPE.MOCK, readOnly: true }), false);
  assert.equal(canSoftDeleteByDemoAction({ scope: DOCUMENT_SCOPE.USER, readOnly: true }), false);
  assert.equal(canSoftDeleteByDemoAction({ scope: DOCUMENT_SCOPE.USER, readOnly: false }), true);
});
