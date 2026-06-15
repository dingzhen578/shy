import test from "node:test";
import assert from "node:assert/strict";

import {
  DAILY_FREE_LIMIT,
  MEMBERSHIP_CODES,
  activateMembership,
  getNotebookFeatureAccess,
  getMembershipStatus,
  normalizeFreeUsage
} from "../src/lib/membership.js";

const NOW = new Date("2026-06-13T08:00:00.000Z");

test("membership configuration contains the requested codes", () => {
  assert.deepEqual(Object.keys(MEMBERSHIP_CODES).sort(), [
    "HISTORY-7DAYS-001",
    "HISTORY-7DAYS-002",
    "HISTORY-7DAYS-003",
    "HISTORY-7DAYS-004",
    "HISTORY-7DAYS-005",
    "HISTORY-7DAYS-006",
    "HISTORY-7DAYS-007",
    "HISTORY-7DAYS-008",
    "HISTORY-7DAYS-009",
    "HISTORY-7DAYS-010",
    "HISTORY-MONTH-001",
    "HISTORY-MONTH-002",
    "HISTORY-MONTH-003",
    "HISTORY-MONTH-004",
    "HISTORY-MONTH-005",
    "HISTORY-MONTH-006",
    "HISTORY-MONTH-007",
    "HISTORY-MONTH-008",
    "HISTORY-MONTH-009",
    "HISTORY-MONTH-010",
    "HISTORY-VIP-TEST"
  ]);
});

test("a configured 7 day code activates for exactly 7 days", () => {
  const result = activateMembership(" history-7days-001 ", [], NOW);

  assert.equal(result.ok, true);
  assert.equal(result.membership.type, "7days");
  assert.equal(result.membership.code, "HISTORY-7DAYS-001");
  assert.equal(result.membership.activatedAt, "2026-06-13T08:00:00.000Z");
  assert.equal(result.membership.expiresAt, "2026-06-20T08:00:00.000Z");
});

test("a configured month code activates for exactly 30 days", () => {
  const result = activateMembership("HISTORY-MONTH-003", [], NOW);

  assert.equal(result.ok, true);
  assert.equal(result.membership.type, "month");
  assert.equal(result.membership.expiresAt, "2026-07-13T08:00:00.000Z");
});

test("the permanent test code has no expiry", () => {
  const result = activateMembership("HISTORY-VIP-TEST", [], NOW);

  assert.equal(result.ok, true);
  assert.equal(result.membership.type, "permanent");
  assert.equal(result.membership.expiresAt, null);
});

test("invalid and already used codes are rejected", () => {
  assert.equal(activateMembership("HISTORY-7DAYS-999", [], NOW).reason, "invalid");
  assert.equal(
    activateMembership("HISTORY-7DAYS-001", ["HISTORY-7DAYS-001"], NOW).reason,
    "used"
  );
});

test("membership status keeps active and permanent memberships", () => {
  const active = activateMembership("HISTORY-7DAYS-001", [], NOW).membership;
  const permanent = activateMembership("HISTORY-VIP-TEST", [], NOW).membership;

  assert.equal(getMembershipStatus(active, new Date("2026-06-19T08:00:00.000Z")).status, "active");
  assert.equal(getMembershipStatus(permanent, new Date("2036-06-13T08:00:00.000Z")).status, "active");
});

test("membership status marks expired and malformed memberships for clearing", () => {
  const expired = activateMembership("HISTORY-7DAYS-001", [], NOW).membership;

  assert.equal(getMembershipStatus(expired, new Date("2026-06-20T08:00:00.000Z")).status, "expired");
  assert.equal(getMembershipStatus({ type: "month" }, NOW).status, "invalid");
});

test("free usage resets on a new day and clamps same-day values", () => {
  assert.deepEqual(normalizeFreeUsage(null, "2026-06-13"), {
    date: "2026-06-13",
    remaining: DAILY_FREE_LIMIT
  });
  assert.deepEqual(normalizeFreeUsage({ date: "2026-06-12", remaining: 0 }, "2026-06-13"), {
    date: "2026-06-13",
    remaining: DAILY_FREE_LIMIT
  });
  assert.deepEqual(normalizeFreeUsage({ date: "2026-06-13", remaining: 99 }, "2026-06-13"), {
    date: "2026-06-13",
    remaining: DAILY_FREE_LIMIT
  });
  assert.deepEqual(normalizeFreeUsage({ date: "2026-06-13", remaining: -2 }, "2026-06-13"), {
    date: "2026-06-13",
    remaining: 0
  });
});

test("free users receive one basic generation per day", () => {
  assert.equal(DAILY_FREE_LIMIT, 1);
  assert.deepEqual(normalizeFreeUsage(null, "2026-06-15"), {
    date: "2026-06-15",
    remaining: 1
  });
  assert.deepEqual(
    normalizeFreeUsage({ date: "2026-06-15", remaining: 3 }, "2026-06-15"),
    { date: "2026-06-15", remaining: 1 }
  );
});

test("copy and image export require an active membership", () => {
  assert.deepEqual(getNotebookFeatureAccess(false), {
    canCopy: false,
    canSaveImage: false
  });
  assert.deepEqual(getNotebookFeatureAccess(true), {
    canCopy: true,
    canSaveImage: true
  });
});
