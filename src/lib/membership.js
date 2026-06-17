export const DAILY_FREE_LIMIT = 1;
export const FREE_USAGE_STORAGE_KEY = "history-senior-notes-free-usage";
export const MEMBERSHIP_STORAGE_KEY = "history-senior-notes-membership";
export const USED_MEMBERSHIP_CODES_STORAGE_KEY = "history-senior-notes-used-membership-codes";

export const MEMBERSHIP_CODES = Object.freeze({
  // 7-day experience codes.
  "HUBMLS9276642LXX": { type: "7days", durationDays: 7 },
  "H8X1WQV0LDXBXY9M": { type: "7days", durationDays: 7 },
  "HCPQIH13HEA54D9A": { type: "7days", durationDays: 7 },
  "HDD4ZQT8JTO166AL": { type: "7days", durationDays: 7 },
  "HZIXN3BWCN62DAGI": { type: "7days", durationDays: 7 },
  "HH01RHJ0G607CY9G": { type: "7days", durationDays: 7 },
  "HXUH0NI9GB0AWP76": { type: "7days", durationDays: 7 },
  "HIIOQLDMIMKVEQP0": { type: "7days", durationDays: 7 },
  "HPXOGOIHMSODOY6P": { type: "7days", durationDays: 7 },
  "HY4PM6ZL1A9E8WWA": { type: "7days", durationDays: 7 },
  // Monthly codes.
  "H5862CZJ31U0ET3M": { type: "month", durationDays: 30 },
  "HC28DXBZT0T0U6E3": { type: "month", durationDays: 30 },
  "HWAWLFO92ETGHZ0Z": { type: "month", durationDays: 30 },
  "H768XP2792K1BOIE": { type: "month", durationDays: 30 },
  "HUMH0KQ4RKE8THTL": { type: "month", durationDays: 30 },
  "HPEG00E8TIGVKJFM": { type: "month", durationDays: 30 },
  "H7KDESCBQGP9RYG2": { type: "month", durationDays: 30 },
  "HZG8057Y49RXX2VJ": { type: "month", durationDays: 30 },
  "HEB1HFZ1UV01ZQHB": { type: "month", durationDays: 30 },
  "H2WASTWBX0WXYISG": { type: "month", durationDays: 30 }
});

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function getNotebookFeatureAccess(hasActiveMembership) {
  return {
    canCopy: hasActiveMembership === true,
    canSaveImage: hasActiveMembership === true
  };
}

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
