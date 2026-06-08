export const LIFECYCLE_STATUS = Object.freeze({
  ACTIVE: "active",
  TRASHED: "trashed",
});

export const LIFECYCLE_STATUSES = Object.freeze(Object.values(LIFECYCLE_STATUS));

export const DEMO_SESSION_STATUS = Object.freeze({
  ACTIVE: "active",
  EXPIRED: "expired",
});

export const DEMO_SESSION_STATUSES = Object.freeze(Object.values(DEMO_SESSION_STATUS));

export const CLEANUP_STATUS = Object.freeze({
  NOT_STARTED: "not_started",
  ACCEPTED: "accepted",
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
});

export const CLEANUP_STATUSES = Object.freeze(Object.values(CLEANUP_STATUS));
