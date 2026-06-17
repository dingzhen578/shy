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

const SEVEN_DAY_CODE = "HUBMLS9276642LXX";
const MONTH_CODE = "H5862CZJ31U0ET3M";

test("membership configuration contains the requested codes", () => {
  assert.deepEqual(Object.keys(MEMBERSHIP_CODES).sort(), [
    "H2WASTWBX0WXYISG",
    "H5862CZJ31U0ET3M",
    "H768XP2792K1BOIE",
    "H7KDESCBQGP9RYG2",
    "H8X1WQV0LDXBXY9M",
    "HC28DXBZT0T0U6E3",
    "HCPQIH13HEA54D9A",
    "HDD4ZQT8JTO166AL",
    "HEB1HFZ1UV01ZQHB",
    "HH01RHJ0G607CY9G",
    "HIIOQLDMIMKVEQP0",
    "HPEG00E8TIGVKJFM",
    "HPXOGOIHMSODOY6P",
    "HUBMLS9276642LXX",
    "HUMH0KQ4RKE8THTL",
    "HWAWLFO92ETGHZ0Z",
    "HXUH0NI9GB0AWP76",
    "HY4PM6ZL1A9E8WWA",
    "HZG8057Y49RXX2VJ",
    "HZIXN3BWCN62DAGI"
  ]);
});

test("configured membership codes are 16 uppercase alphanumeric characters starting with H", () => {
  for (const code of Object.keys(MEMBERSHIP_CODES)) {
    assert.match(code, /^H[A-Z0-9]{15}$/);
  }
});

test("a configured 7 day code activates for exactly 7 days", () => {
  const result = activateMembership(` ${SEVEN_DAY_CODE.toLowerCase()} `, [], NOW);

  assert.equal(result.ok, true);
  assert.equal(result.membership.type, "7days");
  assert.equal(result.membership.code, SEVEN_DAY_CODE);
  assert.equal(result.membership.activatedAt, "2026-06-13T08:00:00.000Z");
  assert.equal(result.membership.expiresAt, "2026-06-20T08:00:00.000Z");
});

test("a configured month code activates for exactly 30 days", () => {
  const result = activateMembership(MONTH_CODE, [], NOW);

  assert.equal(result.ok, true);
  assert.equal(result.membership.type, "month");
  assert.equal(result.membership.expiresAt, "2026-07-13T08:00:00.000Z");
});

test("invalid and already used codes are rejected", () => {
  assert.equal(activateMembership("H000000000000000", [], NOW).reason, "invalid");
  assert.equal(activateMembership(SEVEN_DAY_CODE, [SEVEN_DAY_CODE], NOW).reason, "used");
});

test("membership status keeps active and permanent memberships", () => {
  const active = activateMembership(SEVEN_DAY_CODE, [], NOW).membership;
  const permanent = {
    type: "permanent",
    activatedAt: NOW.toISOString(),
    expiresAt: null,
    code: "HMANUALPERMANENT"
  };

  assert.equal(getMembershipStatus(active, new Date("2026-06-19T08:00:00.000Z")).status, "active");
  assert.equal(getMembershipStatus(permanent, new Date("2036-06-13T08:00:00.000Z")).status, "active");
});

test("membership status marks expired and malformed memberships for clearing", () => {
  const expired = activateMembership(SEVEN_DAY_CODE, [], NOW).membership;

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
