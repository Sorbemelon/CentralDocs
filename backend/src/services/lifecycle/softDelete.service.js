import {
  DOCUMENT_SCOPE,
  DOCUMENT_STATUS,
  FOLDER_SCOPE,
} from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";

export function buildSoftDeletePatch({
  demoSessionId,
  deleteOperationId,
  now = new Date(),
  originalFolderIdBeforeDelete = null,
} = {}) {
  return {
    lifecycleStatus: LIFECYCLE_STATUS.TRASHED,
    deletedAt: now,
    deletedByDemoSessionId: demoSessionId ?? null,
    deleteOperationId: deleteOperationId ?? null,
    originalFolderIdBeforeDelete: originalFolderIdBeforeDelete ?? null,
  };
}

export function buildRestorePatch({ restoreFolderId = null } = {}) {
  return {
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    deletedAt: null,
    deletedByDemoSessionId: null,
    deleteOperationId: null,
    originalFolderIdBeforeDelete: null,
    restoreParentFolderId: restoreFolderId,
  };
}

export function isActiveLifecycle(entity) {
  return entity?.lifecycleStatus === LIFECYCLE_STATUS.ACTIVE;
}

export function isTrashedLifecycle(entity) {
  return entity?.lifecycleStatus === LIFECYCLE_STATUS.TRASHED;
}

export function activeOnlyFilter(extraFilter = {}) {
  return {
    ...extraFilter,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  };
}

export function excludeTrashedFilter(extraFilter = {}) {
  return activeOnlyFilter(extraFilter);
}

export function shouldExcludeFromRetrieval(entity) {
  if (!entity || isTrashedLifecycle(entity)) {
    return true;
  }

  if ("status" in entity && entity.status !== DOCUMENT_STATUS.READY) {
    return true;
  }

  return false;
}

export function canSoftDeleteByDemoAction(entity) {
  const isMockScope = entity?.scope === DOCUMENT_SCOPE.MOCK || entity?.scope === FOLDER_SCOPE.MOCK;

  if (!entity || entity.readOnly || isMockScope) {
    return false;
  }

  return true;
}
