export const DAILY_FREE_LIMIT = 3;
export const FREE_USAGE_STORAGE_KEY = "history-senior-notes-free-usage";
export const MEMBERSHIP_STORAGE_KEY = "history-senior-notes-membership";
export const USED_MEMBERSHIP_CODES_STORAGE_KEY = "history-senior-notes-used-membership-codes";

export const MEMBERSHIP_CODES = Object.freeze({
  "HISTORY-7DAYS-001": { type: "7days", durationDays: 7 },
  "HISTORY-7DAYS-002": { type: "7days", durationDays: 7 },
  "HISTORY-7DAYS-003": { type: "7days", durationDays: 7 },
  "HISTORY-7DAYS-004": { type: "7days", durationDays: 7 },
  "HISTORY-7DAYS-005": { type: "7days", durationDays: 7 },
  "HISTORY-7DAYS-006": { type: "7days", durationDays: 7 },
  "HISTORY-7DAYS-007": { type: "7days", durationDays: 7 },
  "HISTORY-7DAYS-008": { type: "7days", durationDays: 7 },
  "HISTORY-7DAYS-009": { type: "7days", durationDays: 7 },
  "HISTORY-7DAYS-010": { type: "7days", durationDays: 7 },
  "HISTORY-MONTH-001": { type: "month", durationDays: 30 },
  "HISTORY-MONTH-002": { type: "month", durationDays: 30 },
  "HISTORY-MONTH-003": { type: "month", durationDays: 30 },
  "HISTORY-MONTH-004": { type: "month", durationDays: 30 },
  "HISTORY-MONTH-005": { type: "month", durationDays: 30 },
  "HISTORY-MONTH-006": { type: "month", durationDays: 30 },
  "HISTORY-MONTH-007": { type: "month", durationDays: 30 },
  "HISTORY-MONTH-008": { type: "month", durationDays: 30 },
  "HISTORY-MONTH-009": { type: "month", durationDays: 30 },
  "HISTORY-MONTH-010": { type: "month", durationDays: 30 },
  "HISTORY-VIP-TEST": { type: "permanent", durationDays: null }
});

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function normalizeCode(code) {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

export function activateMembership(rawCode, usedCodes = [], now = new Date()) {
  const code = normalizeCode(rawCode);
  const config = MEMBERSHIP_CODES[code];

  if (!config) {
    return { ok: false, reason: "invalid" };
  }

  const normalizedUsedCodes = usedCodes.map(normalizeCode);

  if (normalizedUsedCodes.includes(code)) {
    return { ok: false, reason: "used" };
  }

  const activatedAt = now.toISOString();
  const expiresAt =
    config.durationDays === null
      ? null
      : new Date(now.getTime() + config.durationDays * DAY_IN_MILLISECONDS).toISOString();

  return {
    ok: true,
    membership: {
      type: config.type,
      activatedAt,
      expiresAt,
      code
    }
  };
}

export function getMembershipStatus(membership, now = new Date()) {
  if (
    !membership ||
    !["7days", "month", "permanent"].includes(membership.type) ||
    typeof membership.activatedAt !== "string" ||
    typeof membership.code !== "string"
  ) {
    return { status: "invalid", membership: null };
  }

  if (membership.type === "permanent") {
    return { status: "active", membership };
  }

  if (typeof membership.expiresAt !== "string") {
    return { status: "invalid", membership: null };
  }

  const expiresAt = Date.parse(membership.expiresAt);

  if (!Number.isFinite(expiresAt)) {
    return { status: "invalid", membership: null };
  }

  if (expiresAt <= now.getTime()) {
    return { status: "expired", membership: null };
  }

  return { status: "active", membership };
}

export function normalizeFreeUsage(value, today) {
  if (
    !value ||
    value.date !== today ||
    typeof value.remaining !== "number" ||
    !Number.isFinite(value.remaining)
  ) {
    return { date: today, remaining: DAILY_FREE_LIMIT };
  }

  return {
    date: today,
    remaining: Math.min(DAILY_FREE_LIMIT, Math.max(0, Math.floor(value.remaining)))
  };
}
