# Paid Conversion Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the daily free allowance to one basic generation and clearly explain why the 7-day and monthly membership options are useful.

**Architecture:** Keep usage limits and feature entitlements in the existing pure membership module so they can be tested without React. The client page will render scenario education, always-visible upgrade benefits for non-members, locked premium actions, membership-code activation, and trust-use cases while retaining the existing localStorage membership flow.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, localStorage, Node test runner.

---

### Task 1: Free Limit and Premium Entitlements

**Files:**
- Modify: `tests/membership.test.mjs`
- Modify: `src/lib/membership.js`

- [ ] **Step 1: Write failing tests**

Add assertions that the daily limit is one and that premium features are unavailable without active membership:

```js
import {
  DAILY_FREE_LIMIT,
  getNotebookFeatureAccess
} from "../src/lib/membership.js";

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
```

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
node --test tests/membership.test.mjs
```

Expected: failure because the limit is still `3` and `getNotebookFeatureAccess` does not exist.

- [ ] **Step 3: Implement the minimal rules**

Change the limit and add the pure feature-access helper:

```js
export const DAILY_FREE_LIMIT = 1;

export function getNotebookFeatureAccess(hasActiveMembership) {
  return {
    canCopy: hasActiveMembership === true,
    canSaveImage: hasActiveMembership === true
  };
}
```

- [ ] **Step 4: Verify the tests pass**

Run:

```bash
npm test
```

Expected: all membership and existing project tests pass.

### Task 2: Lock Premium Actions for Free Users

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Connect the entitlement helper**

Import `getNotebookFeatureAccess`, derive `featureAccess` from active membership, and add a ref for the upgrade section:

```ts
const upgradeCardRef = useRef<HTMLElement>(null);
const featureAccess = getNotebookFeatureAccess(isMember);
```

- [ ] **Step 2: Add one upgrade-navigation handler**

Use a single handler for both locked actions:

```ts
function showMembershipBenefits() {
  setToastMessage("开通体验版后，就可以复制和保存学习卡片啦 ✨");
  upgradeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => setToastMessage(""), 3000);
}
```

- [ ] **Step 3: Guard copy and image export**

At the beginning of each handler, return through `showMembershipBenefits()` when its entitlement is false. This prevents clipboard, image rendering, native sharing, and downloads from running for free users.

- [ ] **Step 4: Make locked state visible**

Keep both buttons visible after an answer is generated. For free users, label them:

```text
🔒 复制答案（会员）
🔒 保存学习卡片（会员）
```

Members retain:

```text
复制这份笔记
分享 / 保存学习卡片
```

### Task 3: Conversion Content and Page Order

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add scenario content after the input form**

Render four responsive small cards under “适合这些场景” using the exact confirmed copy:

```ts
const studyScenarios = [
  "月考前整理历史主观题",
  "把错题整理成答题框架",
  "快速复习背景 / 影响 / 意义",
  "不想每次都从零组织答案"
];
```

- [ ] **Step 2: Move the answer card before the sales card**

Keep the existing answer display unchanged except for premium button labels and guards. This lets the user see the generated value before the upgrade offer.

- [ ] **Step 3: Make the upgrade card visible to every non-member**

Attach `ref={upgradeCardRef}` and render:

```text
解锁完整学习笔记功能 ✨
```

when one free use remains, and:

```text
今天的免费次数用完啦 ✨
```

when no free use remains.

The 7-day card must show:

```text
9.9 元 / 7 天
7天不限次数生成
支持复制答案
支持保存学习卡片图
适合考前集中整理错题
```

The monthly card must show:

```text
14.9 元 / 月
30天不限次数生成
适合长期复习历史主观题
```

Keep the existing contact button and WeChat QR code.

- [ ] **Step 4: Keep membership activation after the upgrade offer**

Move the existing membership-code form after the pricing card. Active members still see the existing active-membership status card.

- [ ] **Step 5: Add the trust-use section**

Render “大家一般这样用它” with:

```ts
const commonUses = [
  "整理错题",
  "考前复习",
  "练习主观题结构",
  "生成学习卡片"
];
```

Use factual use-case labels only, without invented user counts or testimonials.

### Task 4: Documentation and Automated Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update MVP documentation**

Document:

```text
每个浏览器每天免费生成 1 次。
免费版只提供基础答案生成。
复制答案和保存学习卡片图需要激活会员码。
```

- [ ] **Step 2: Update free-limit testing instructions**

State that deleting `history-senior-notes-free-usage` resets the browser to `1/1`, and setting `remaining` to `0` displays the exhausted state.

- [ ] **Step 3: Run all automated checks**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: every command exits with status `0`.

### Task 5: Browser Verification

**Files:**
- Verify: `app/page.tsx`

- [ ] **Step 1: Test a free user at mobile width**

Clear the membership and usage localStorage keys, reload, and confirm:

```text
今日剩余免费次数：1/1
```

Generate one answer and confirm the count becomes `0/1`.

- [ ] **Step 2: Verify premium locks**

Click both locked action buttons. Confirm neither clipboard nor image download runs, the membership toast appears, and the page scrolls to the upgrade card.

- [ ] **Step 3: Verify member behavior**

Activate `HISTORY-VIP-TEST`, generate an answer, and confirm copying and image sharing/downloading remain functional.

- [ ] **Step 4: Verify responsive presentation**

At iPhone-sized width, confirm no horizontal overflow and that scenario, answer, upgrade, activation, and trust cards remain readable in the confirmed order.

- [ ] **Step 5: Commit and deploy**

Commit the implementation, push `main`, and confirm the matching Vercel production deployment reaches `READY`.
