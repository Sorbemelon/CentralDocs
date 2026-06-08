export function now() {
  return new Date();
}

export function nowIso() {
  return now().toISOString();
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isPast(date) {
  return new Date(date).getTime() <= Date.now();
}
