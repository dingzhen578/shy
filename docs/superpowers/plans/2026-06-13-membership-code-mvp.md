# Membership Code MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-local membership code MVP that preserves the existing three-free-generations-per-day flow and unlocks unlimited generation while membership is active.

**Architecture:** Keep membership and daily-usage rules in a pure JavaScript module so dates, code validation, reuse prevention, and expiry can be tested without a browser. The existing client page owns localStorage reads/writes and renders activation, active membership, expiry, and upgrade states using the current visual language.

**Tech Stack:** Next.js App Router, React 19, TypeScript page, JavaScript helper module, localStorage, Node test runner, Tailwind CSS.

---

### Task 1: Membership and Daily Usage Rules

**Files:**
- Create: `src/lib/membership.js`
- Create: `tests/membership.test.mjs`

- [ ] Write failing tests for configured codes, activation durations, permanent membership, invalid codes, used-code rejection, expired membership, and daily reset.
- [ ] Run `node --test tests/membership.test.mjs` and confirm failure because the module does not exist.
- [ ] Implement constants and pure functions for validation, activation, membership status, and free usage normalization.
- [ ] Run `npm test` and confirm all tests pass.

### Task 2: Client Storage and Activation UI

**Files:**
- Modify: `app/page.tsx`

- [ ] Load free usage, membership, and used-code history from localStorage after mount.
- [ ] Clear expired membership automatically and show the requested expiry message.
- [ ] Add the activation input, activation button, active membership card, and inline feedback.
- [ ] Allow active members to generate without decrementing free usage.
- [ ] Reject a code already used in the same browser.
- [ ] Keep failed generations from decrementing free usage.

### Task 3: Upgrade Card and Verification

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css` only if shared control styling is required.

- [ ] Change the monthly price to `14.9元`.
- [ ] Keep the contact placeholder editable in one page constant.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Verify activation, active membership, expiry messaging, and free-limit UI in the local browser.
