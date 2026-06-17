"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { encouragements } from "@/src/lib/encouragements";
import {
  DAILY_FREE_LIMIT,
  FREE_USAGE_STORAGE_KEY,
  MEMBERSHIP_STORAGE_KEY,
  USED_MEMBERSHIP_CODES_STORAGE_KEY,
  activateMembership,
  getMembershipStatus,
  getNotebookFeatureAccess,
  normalizeFreeUsage
} from "@/src/lib/membership";
import { shareOrDownloadImage } from "@/src/lib/imageShare";

type GenerateResponse = {
  answer?: string;
  error?: string;
};

type OcrResponse = {
  text?: string;
  error?: string;
};

const ocrAcceptedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const ocrAcceptAttribute = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const ocrMaxFileSizeBytes = 5 * 1024 * 1024;
const ocrFailureMessage =
  "这张图片有点模糊，暂时没有识别成功。可以换一张更清晰的图片，或直接手动输入题目。";

const sampleQuestions = [
  "评价洋务运动",
  "分析辛亥革命的历史意义",
  "说明新航路开辟的影响",
  "评价罗斯福新政"
];

const studyScenarios = [
  "月考前整理历史主观题",
  "把错题整理成答题框架",
  "快速复习背景 / 影响 / 意义",
  "不想每次都从零组织答案"
];

const commonUses = ["整理错题", "考前复习", "练习主观题结构", "生成学习卡片"];

type FreeUsage = {
  date: string;
  remaining: number;
};

type Membership = {
  type: "7days" | "month" | "permanent";
  activatedAt: string;
  expiresAt: string | null;
  code: string;
};

type MembershipStatus =
  | { status: "active"; membership: Membership }
  | { status: "expired" | "invalid"; membership: null };

type MembershipActivation =
  | { ok: true; membership: Membership }
  | { ok: false; reason: "invalid" | "used" };

type AnswerSection = {
  id: string;
  label: string;
  fallback: string;
};

const answerSections: AnswerSection[] = [
  {
    id: "background",
    label: "🌟 背景",
    fallback: "此题重点不在该角度。"
  },
  {
    id: "measures",
    label: "📌 措施",
    fallback: "此题重点不在该角度。"
  },
  {
    id: "impact",
    label: "📝 影响",
    fallback: "此题重点不在该角度。"
  },
  {
    id: "limits",
    label: "⚠️ 局限性",
    fallback: "此题重点不在该角度。"
  },
  {
    id: "meaning",
    label: "✨ 历史意义",
    fallback: "此题重点不在该角度。"
  }
];

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function readStoredJson<T>(key: string): T | null {
  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function writeStoredJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Some private browsers disable localStorage. Keep the current session usable.
  }
}

function removeStoredValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

function saveFreeUsage(usage: FreeUsage) {
  writeStoredJson(FREE_USAGE_STORAGE_KEY, usage);
}

function formatMembershipDate(value: string) {
  const date = new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function pickEncouragement() {
  return encouragements[Math.floor(Math.random() * encouragements.length)];
}

function renderInlineMarkdown(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <strong key={`${segment}-${index}`} className="font-semibold text-[#b75f7a]">
          {segment.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${segment}-${index}`}>{segment}</span>;
  });
}

function getSectionName(label: string) {
  return label.replace(/^[^\s]+\s*/, "");
}

function parseAnswerSections(answer: string) {
  const sectionLines = new Map(answerSections.map((section) => [section.id, [] as string[]]));
  let currentSectionId: string | null = null;

  for (const rawLine of answer.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const normalizedLine = line.replace(/^#{1,6}\s*/, "");
    const matchedSection = answerSections.find((section) => {
      const sectionName = getSectionName(section.label);

      return normalizedLine.includes(section.label) || normalizedLine.includes(sectionName);
    });

    if (matchedSection) {
      currentSectionId = matchedSection.id;
      continue;
    }

    if (currentSectionId) {
      sectionLines.get(currentSectionId)?.push(line);
    }
  }

  return answerSections.map((section) => ({
    ...section,
    lines: sectionLines.get(section.id) ?? []
  }));
}

function AnswerRenderer({ answer }: { answer: string }) {
  return (
    <div className="grid gap-3">
      {parseAnswerSections(answer).map((section) => {
        const lines = section.lines.length > 0 ? section.lines : [section.fallback];

        return (
          <section
            key={section.id}
            className="rounded-[1.35rem] bg-white/78 p-4 shadow-[0_12px_32px_rgba(186,132,146,0.10)] ring-1 ring-[#f2e2dc]"
          >
            <h3 className="mb-3 text-[15px] font-semibold text-[#9f4f68]">
              {section.label}
            </h3>
            <div className="space-y-2">
              {lines.map((line, index) => {
                const bullet = line.match(/^[-*]\s+(.+)$/);
                const content = bullet ? bullet[1] : line;

                return (
                  <p key={`${section.id}-${index}`} className="text-[15px] leading-8 text-[#463d3f]">
                    {renderInlineMarkdown(content)}
                  </p>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [encouragement, setEncouragement] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [ocrError, setOcrError] = useState("");
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [freeUsage, setFreeUsage] = useState<FreeUsage>({
    date: "",
    remaining: DAILY_FREE_LIMIT
  });
  const [membership, setMembership] = useState<Membership | null>(null);
  const [usedMembershipCodes, setUsedMembershipCodes] = useState<string[]>([]);
  const [membershipCode, setMembershipCode] = useState("");
  const [membershipMessage, setMembershipMessage] = useState("");
  const [isStorageReady, setIsStorageReady] = useState(false);
  const answerCardRef = useRef<HTMLElement>(null);
  const upgradeCardRef = useRef<HTMLElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isMember = membership !== null;
  const hasFreeUses = freeUsage.remaining > 0;
  const hasGenerationAccess = isMember || hasFreeUses;
  const featureAccess = getNotebookFeatureAccess(isMember);

  useEffect(() => {
    function syncLocalState() {
      const today = getTodayKey();
      const storedUsage = readStoredJson<Partial<FreeUsage>>(FREE_USAGE_STORAGE_KEY);
      const nextUsage = normalizeFreeUsage(storedUsage, today) as FreeUsage;
      const storedUsedCodes = readStoredJson<unknown>(USED_MEMBERSHIP_CODES_STORAGE_KEY);
      const nextUsedCodes = Array.isArray(storedUsedCodes)
        ? storedUsedCodes.filter((code): code is string => typeof code === "string")
        : [];
      const storedMembership = readStoredJson<Membership>(MEMBERSHIP_STORAGE_KEY);
      const membershipStatus = getMembershipStatus(
        storedMembership,
        new Date()
      ) as MembershipStatus;

      saveFreeUsage(nextUsage);
      setFreeUsage(nextUsage);
      setUsedMembershipCodes(nextUsedCodes);

      if (membershipStatus.status === "active") {
        setMembership(membershipStatus.membership);
      } else {
        removeStoredValue(MEMBERSHIP_STORAGE_KEY);
        setMembership(null);

        if (membershipStatus.status === "expired") {
          setMembershipMessage("会员体验已结束，可以重新开通继续使用。");
        }
      }

      setIsStorageReady(true);
    }

    const initialTimer = window.setTimeout(syncLocalState, 0);
    const expiryTimer = window.setInterval(syncLocalState, 60_000);

    window.addEventListener("focus", syncLocalState);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(expiryTimer);
      window.removeEventListener("focus", syncLocalState);
    };
  }, []);

  function decrementFreeUsage(currentUsage: FreeUsage) {
    const nextUsage = {
      date: getTodayKey(),
      remaining: Math.max(0, currentUsage.remaining - 1)
    };

    saveFreeUsage(nextUsage);
    setFreeUsage(nextUsage);
  }

  function handleMembershipActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = activateMembership(
      membershipCode,
      usedMembershipCodes,
      new Date()
    ) as MembershipActivation;

    if (!result.ok) {
      setMembershipMessage("会员码好像不太对，请检查后再试一下。");
      return;
    }

    const nextUsedCodes = Array.from(
      new Set([...usedMembershipCodes, result.membership.code])
    );

    writeStoredJson(MEMBERSHIP_STORAGE_KEY, result.membership);
    writeStoredJson(USED_MEMBERSHIP_CODES_STORAGE_KEY, nextUsedCodes);
    setMembership(result.membership);
    setUsedMembershipCodes(nextUsedCodes);
    setMembershipCode("");
    setMembershipMessage("");
    setToastMessage("会员已激活 ✨");
    window.setTimeout(() => setToastMessage(""), 2600);
  }

  function showMembershipBenefits() {
    setToastMessage("开通体验版后，就可以复制和保存学习卡片啦 ✨");
    upgradeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => setToastMessage(""), 3000);
  }

  async function handleSaveImage() {
    if (!featureAccess.canSaveImage) {
      showMembershipBenefits();
      return;
    }

    if (!answerCardRef.current) {
      return;
    }

    setIsSavingImage(true);

    try {
      const { toBlob } = await import("html-to-image");
      const imageBlob = await toBlob(answerCardRef.current, {
        backgroundColor: "#fffaf5",
        cacheBust: true,
        pixelRatio: Math.min(2, window.devicePixelRatio || 2)
      });

      if (!imageBlob) {
        throw new Error("Failed to create notebook image.");
      }

      const result = await shareOrDownloadImage({
        blob: imageBlob,
        fileName: `历史学姐笔记-${getTodayKey()}.png`
      });

      if (result === "shared") {
        setToastMessage("已经打开分享啦，可以发给同学或保存到相册 ✨");
      } else if (result === "downloaded") {
        setToastMessage("学习卡片已经保存好啦 ✨");
      } else {
        setToastMessage("已取消分享，笔记还在这里。");
      }

      window.setTimeout(() => setToastMessage(""), 3000);
    } catch (saveError) {
      console.error("Failed to save notebook image:", saveError);
      setToastMessage("学习卡片暂时生成失败，请稍后再试一下。");
      window.setTimeout(() => setToastMessage(""), 3000);
    } finally {
      setIsSavingImage(false);
    }
  }

  async function handleCopyAnswer() {
    if (!featureAccess.canCopy) {
      showMembershipBenefits();
      return;
    }

    if (!answer) {
      return;
    }

    try {
      await navigator.clipboard.writeText(answer);
      setToastMessage("已经复制好啦，可以放进你的错题本里 ✨");
      window.setTimeout(() => setToastMessage(""), 2600);
    } catch (copyError) {
      console.error("Failed to copy notebook answer:", copyError);
      setToastMessage("复制暂时失败，请稍后再试一下。");
      window.setTimeout(() => setToastMessage(""), 2600);
    }
  }

  function clearImageInput() {
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  async function handleQuestionImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setOcrMessage("");
    setOcrError("");

    if (!ocrAcceptedMimeTypes.has(file.type)) {
      setOcrError("请上传 jpg、jpeg、png 或 webp 格式的图片。");
      clearImageInput();
      return;
    }

    if (file.size > ocrMaxFileSizeBytes) {
      setOcrError("图片太大啦，请上传 5MB 以内的图片。");
      clearImageInput();
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setIsOcrLoading(true);
    setOcrMessage("正在识别题目文字，请稍等一下 📖");
    setError("");

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as OcrResponse;

      if (!response.ok) {
        throw new Error(data.error || ocrFailureMessage);
      }

      const recognizedText = data.text?.trim();

      if (!recognizedText) {
        throw new Error(ocrFailureMessage);
      }

      setQuestion(recognizedText);
      setAnswer("");
      setEncouragement("");
      setOcrError("");
      setOcrMessage("我识别出了下面这道题，你可以先检查一下再生成答案 ✨");
    } catch (uploadError) {
      setOcrMessage("");
      setOcrError(
        uploadError instanceof Error ? uploadError.message : ocrFailureMessage
      );
    } finally {
      setIsOcrLoading(false);
      clearImageInput();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    const currentUsage = normalizeFreeUsage(
      freeUsage,
      getTodayKey()
    ) as FreeUsage;
    const membershipStatus = getMembershipStatus(
      membership,
      new Date()
    ) as MembershipStatus;
    const hasActiveMembership = membershipStatus.status === "active";

    if (membership && !hasActiveMembership) {
      removeStoredValue(MEMBERSHIP_STORAGE_KEY);
      setMembership(null);
      setMembershipMessage("会员体验已结束，可以重新开通继续使用。");
    }

    if (
      currentUsage.date !== freeUsage.date ||
      currentUsage.remaining !== freeUsage.remaining
    ) {
      saveFreeUsage(currentUsage);
      setFreeUsage(currentUsage);
    }

    if (!trimmedQuestion) {
      setError("先写一道历史题目吧，例如：评价洋务运动。");
      setAnswer("");
      setEncouragement("");
      return;
    }

    if (!hasActiveMembership && currentUsage.remaining <= 0) {
      setError("");
      return;
    }

    setIsLoading(true);
    setError("");
    setAnswer("");
    setEncouragement("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: trimmedQuestion })
      });

      const data = (await response.json()) as GenerateResponse;

      if (!response.ok) {
        throw new Error(data.error || "小助手刚刚走神了，请稍后再试一下。");
      }

      if (!data.answer?.trim()) {
        throw new Error("小助手刚刚走神了，请稍后再试一下。");
      }

      setAnswer(data.answer);
      setEncouragement(pickEncouragement());

      if (!hasActiveMembership) {
        decrementFreeUsage(currentUsage);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "小助手刚刚走神了，请稍后再试一下。"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-5 text-[#2f292b] sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#ffdbe7]/70 blur-3xl" />
        <div className="absolute right-[-5rem] top-32 h-80 w-80 rounded-full bg-[#eadcff]/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#ffe8c7]/60 blur-3xl" />
      </div>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-10 pt-5 sm:pt-10">
        <header className="rounded-[2.2rem] border border-white/70 bg-white/60 px-5 py-7 text-center shadow-[0_24px_70px_rgba(186,132,146,0.14)] backdrop-blur-xl sm:px-8 sm:py-10">
          <p className="mb-3 text-xs font-semibold uppercase text-[#c06d87]">
            Study Notebook
          </p>
          <h1 className="text-[2.55rem] font-semibold leading-none text-[#30282b] sm:text-6xl">
            历史学姐笔记 ✨
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-8 text-[#7b6f73] sm:text-base">
            把历史主观题整理成高考答案
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#8a7b7f]">
            输入一道历史题，自动生成背景、措施、影响、局限性和历史意义。
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-medium text-[#9c7480]">
            <span className="rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-[#f1dce3]">
              主观题整理
            </span>
            <span className="rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-[#f1dce3]">
              高考表达
            </span>
            <span className="rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-[#f1dce3]">
              适合背诵
            </span>
            {isMember ? (
              <span className="rounded-full bg-[#f6efff] px-3 py-1.5 text-[#8f6ab3] ring-1 ring-[#e7d7f5]">
                会员版：今日无限生成
              </span>
            ) : (
              <span className="rounded-full bg-[#fff0dc] px-3 py-1.5 text-[#b56f46] ring-1 ring-[#f6dec0]">
                今日剩余免费次数：{freeUsage.remaining}/{DAILY_FREE_LIMIT}
              </span>
            )}
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2.1rem] border border-white/75 bg-[#fffaf5]/90 p-4 shadow-[0_22px_65px_rgba(186,132,146,0.13)] backdrop-blur-xl sm:p-6"
        >
          <div className="mb-3 flex items-end justify-between gap-3">
            <label htmlFor="history-question" className="block text-sm font-semibold text-[#473c40]">
              今天想整理哪一道历史题？
            </label>
            <span className="hidden text-xs text-[#ad8f98] sm:inline">
              先写题目，再让学姐整理
            </span>
          </div>
          <textarea
            id="history-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="例如：评价洋务运动"
            className="min-h-44 w-full resize-y rounded-[1.75rem] border border-[#efd9d1] bg-white/80 px-4 py-4 text-base leading-8 text-[#332b2e] outline-none transition duration-200 placeholder:text-[#b6a8ac] focus:border-[#e6a0b6] focus:bg-white focus:shadow-[0_0_0_5px_rgba(235,166,190,0.18)]"
          />

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              ref={imageInputRef}
              type="file"
              accept={ocrAcceptAttribute}
              onChange={handleQuestionImageChange}
              className="hidden"
              aria-label="上传题目图片"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isOcrLoading}
              className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-full border border-[#ead0da] bg-white/78 px-5 text-sm font-semibold text-[#9f4f68] shadow-[0_12px_26px_rgba(186,132,146,0.10)] transition hover:-translate-y-0.5 hover:bg-[#fff5fb] active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isOcrLoading ? "正在识别..." : "📷 上传题目图片"}
            </button>
            <p className="text-xs leading-6 text-[#aa9098]">
              支持 jpg、png、webp，单张不超过 5MB
            </p>
          </div>

          <div aria-live="polite">
            {ocrMessage ? (
              <p className="mt-3 rounded-3xl bg-[#fff5fb] px-4 py-3 text-sm leading-7 text-[#9a6474] ring-1 ring-[#f4d7e3]">
                {ocrMessage}
              </p>
            ) : null}
            {ocrError ? (
              <p className="mt-3 rounded-3xl bg-[#fff4f4] px-4 py-3 text-sm leading-7 text-[#a45151] ring-1 ring-[#f3c8c8]">
                {ocrError}
              </p>
            ) : null}
          </div>

          <p className="mt-3 text-sm font-semibold text-[#9f4f68]">
            试试这些题目
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sampleQuestions.map((sampleQuestion) => (
              <button
                key={sampleQuestion}
                type="button"
                onClick={() => setQuestion(sampleQuestion)}
                className="min-h-0 shrink-0 rounded-full border border-[#f0d9df] bg-white/72 px-3.5 py-2 text-xs font-semibold text-[#9b6677] shadow-none transition hover:-translate-y-0.5 hover:bg-[#fff5fb] hover:shadow-[0_10px_22px_rgba(210,135,176,0.12)] active:scale-[0.98]"
              >
                {sampleQuestion}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-7 text-[#8a7b7f]">
              {isMember
                ? "会员版：今日无限生成"
                : `今日剩余免费次数：${freeUsage.remaining}/${DAILY_FREE_LIMIT}`}
            </p>
            <button
              type="submit"
              disabled={isLoading || isOcrLoading || !isStorageReady || !hasGenerationAccess}
              className="inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#f0a8c3_0%,#c7a6ee_100%)] px-7 text-base font-semibold text-white shadow-[0_18px_34px_rgba(210,135,176,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(210,135,176,0.34)] active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isLoading ? "正在整理中..." : "帮我整理答案"}
            </button>
          </div>
        </form>

        <section className="rounded-[2.1rem] border border-white/75 bg-white/58 p-5 shadow-[0_18px_55px_rgba(186,132,146,0.09)] backdrop-blur-xl sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c06d87]">
            Study Moments
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#3f3539]">适合这些场景</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {studyScenarios.map((scenario, index) => (
              <div
                key={scenario}
                className="flex min-h-[4.75rem] items-center gap-3 rounded-[1.45rem] bg-[#fffaf7]/88 px-4 py-3 text-sm leading-7 text-[#6f6266] shadow-[0_10px_28px_rgba(186,132,146,0.08)] ring-1 ring-[#f1e1dd]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff0f5] text-xs font-semibold text-[#b75f7a] ring-1 ring-[#f2d7e1]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{scenario}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-live="polite"
          aria-busy={isLoading}
          className="min-h-80 rounded-[2.1rem] border border-white/75 bg-[#fffaf5]/90 p-5 shadow-[0_22px_65px_rgba(186,132,146,0.12)] backdrop-blur-xl sm:p-7"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[#c06d87]">
                Notebook Card
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[#342c2f]">
                学姐整理好的答案
              </h2>
            </div>
            <span className="rounded-full bg-[#fff0dc] px-3 py-1.5 text-xs font-semibold text-[#b56f46] ring-1 ring-[#f6dec0]">
              可截图
            </span>
          </div>

          {isLoading ? (
            <div className="rounded-[1.75rem] bg-white/70 px-5 py-8 text-center text-[15px] leading-8 text-[#7d7175] ring-1 ring-[#f0e2dd]">
              小助手正在认真整理答案，请稍等一下 ✨
            </div>
          ) : error ? (
            <div className="rounded-[1.75rem] border border-[#f3c8c8] bg-[#fff4f4] px-5 py-4 text-sm leading-7 text-[#a45151]">
              {error}
            </div>
          ) : answer ? (
            <div className="space-y-4">
              <article
                ref={answerCardRef}
                className="rounded-[1.85rem] bg-[#fffdf9] p-5 shadow-[inset_0_0_0_1px_rgba(240,226,221,0.9)] sm:p-7"
              >
                <div className="mb-4 border-b border-[#f1ded8] pb-4">
                  <p className="text-xs font-semibold uppercase text-[#c06d87]">
                    历史学姐笔记
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#b75f7a]">
                    主观题学习卡片
                  </p>
                </div>
                {encouragement ? (
                  <p className="mb-4 rounded-3xl bg-[#fff5fb] px-4 py-3 text-sm leading-7 text-[#9a6474] ring-1 ring-[#f4d7e3]">
                    {encouragement}
                  </p>
                ) : null}
                <AnswerRenderer answer={answer} />
                <p className="mt-5 border-t border-[#f1ded8] pt-4 text-center text-sm font-semibold text-[#b75f7a]">
                  历史学姐笔记 ✨
                </p>
              </article>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyAnswer}
                  className={`inline-flex min-h-[3rem] w-full items-center justify-center rounded-full border px-5 text-sm font-semibold shadow-[0_14px_28px_rgba(186,132,146,0.12)] transition hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto ${
                    featureAccess.canCopy
                      ? "border-[#ead0da] bg-white/78 text-[#9f4f68] hover:bg-[#fff5fb]"
                      : "border-[#e5d8e9] bg-[#faf6fc] text-[#8a718e] hover:bg-[#f6eef9]"
                  }`}
                >
                  {featureAccess.canCopy ? "复制这份笔记" : "🔒 复制答案（会员）"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveImage}
                  disabled={featureAccess.canSaveImage && isSavingImage}
                  className={`inline-flex min-h-[3rem] w-full items-center justify-center rounded-full border px-5 text-sm font-semibold shadow-[0_14px_28px_rgba(186,132,146,0.12)] transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
                    featureAccess.canSaveImage
                      ? "border-[#ead0da] bg-white/78 text-[#9f4f68] hover:bg-[#fff5fb]"
                      : "border-[#e5d8e9] bg-[#faf6fc] text-[#8a718e] hover:bg-[#f6eef9]"
                  }`}
                >
                  {featureAccess.canSaveImage
                    ? isSavingImage
                      ? "正在生成图片..."
                      : "分享 / 保存学习卡片"
                    : "🔒 保存学习卡片（会员）"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.75rem] bg-white/70 px-5 py-10 text-center text-sm leading-8 text-[#8a7b7f] ring-1 ring-[#f0e2dd]">
              整理后的答案会出现在这里，像一张干净的复习手账卡片。
            </div>
          )}
        </section>

        {membership ? (
          <section className="rounded-[2.1rem] border border-[#e7d8ef] bg-[#fcf8ff]/92 p-5 shadow-[0_22px_65px_rgba(168,139,190,0.13)] backdrop-blur-xl sm:p-6">
            <p className="text-lg font-semibold text-[#9067aa]">会员已激活 ✨</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-[#6f5f78]">
              会员版：今日无限生成
            </p>
            <div className="mt-4 rounded-3xl bg-white/72 px-4 py-4 text-sm leading-7 text-[#7b6f82] ring-1 ring-[#eadff1]">
              {membership.type === "permanent" ? (
                <p className="font-semibold text-[#9067aa]">永久测试会员</p>
              ) : (
                <p>
                  有效期至：
                  <span className="font-semibold text-[#9067aa]">
                    {formatMembershipDate(membership.expiresAt as string)}
                  </span>
                </p>
              )}
            </div>
          </section>
        ) : (
          <>
            <section
              ref={upgradeCardRef}
              className="scroll-mt-5 rounded-[2.1rem] border border-[#efcfdb] bg-[#fff8fb]/96 p-5 shadow-[0_24px_70px_rgba(186,132,146,0.15)] backdrop-blur-xl sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c06d87]">
                Full Notebook
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#9f4f68]">
                {hasFreeUses ? "解锁完整学习笔记功能 ✨" : "今天的免费次数用完啦 ✨"}
              </h2>
              <p className="mt-3 text-sm leading-8 text-[#776b6f]">
                免费版可以体验基础答案生成。开通后，整理错题时不用担心次数，也可以直接复制和保存学习卡片。
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="relative overflow-hidden rounded-[1.75rem] bg-white/82 p-5 shadow-[0_16px_38px_rgba(186,132,146,0.11)] ring-1 ring-[#f0d7e0]">
                  <span className="absolute right-4 top-4 rounded-full bg-[#fff0f5] px-3 py-1 text-[11px] font-semibold text-[#b75f7a]">
                    考前推荐
                  </span>
                  <p className="text-sm font-semibold text-[#8c6874]">7天体验版</p>
                  <p className="mt-3 text-3xl font-semibold text-[#b75f7a]">
                    9.9 元
                    <span className="ml-1 text-sm font-medium text-[#9a858c]">/ 7 天</span>
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm leading-7 text-[#66595e]">
                    <li>✓ 7天不限次数生成</li>
                    <li>✓ 支持复制答案</li>
                    <li>✓ 支持保存学习卡片图</li>
                    <li>✓ 适合考前集中整理错题</li>
                  </ul>
                </div>

                <div className="rounded-[1.75rem] bg-[#fcf8ff]/88 p-5 shadow-[0_16px_38px_rgba(168,139,190,0.10)] ring-1 ring-[#e7d9ef]">
                  <p className="text-sm font-semibold text-[#826b91]">月卡</p>
                  <p className="mt-3 text-3xl font-semibold text-[#956eae]">
                    14.9 元
                    <span className="ml-1 text-sm font-medium text-[#95879d]">/ 月</span>
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm leading-7 text-[#665c6c]">
                    <li>✓ 30天不限次数生成</li>
                    <li>✓ 适合长期复习历史主观题</li>
                  </ul>
                </div>
              </div>

              <a
                href="#wechat-contact"
                className="mt-5 inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#f0a8c3_0%,#c7a6ee_100%)] px-7 text-base font-semibold text-white shadow-[0_18px_36px_rgba(210,135,176,0.27)] transition hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto"
              >
                联系我开通
              </a>

              <div
                id="wechat-contact"
                className="mt-5 scroll-mt-5 rounded-[1.75rem] border border-[#ead5dc] bg-white/68 p-4 text-center text-sm leading-7 text-[#9b7e87]"
              >
                <p className="font-semibold text-[#9f4f68]">微信扫码联系开通</p>
                <p className="mt-1">添加时可以备注“历史会员”。</p>
                <div className="mx-auto mt-4 max-w-[17rem] overflow-hidden rounded-[1.4rem] bg-white p-2 shadow-[0_16px_38px_rgba(186,132,146,0.13)] ring-1 ring-[#f0dde3]">
                  <Image
                    src="/wechat-qr.jpg"
                    alt="微信开通会员二维码"
                    width={888}
                    height={1131}
                    className="h-auto w-full rounded-[1rem]"
                    sizes="(max-width: 640px) 75vw, 272px"
                    priority={false}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[2.1rem] border border-white/75 bg-[#fffaf5]/88 p-5 shadow-[0_18px_55px_rgba(186,132,146,0.10)] backdrop-blur-xl sm:p-6">
              <div className="mb-4">
                <p className="text-base font-semibold text-[#9f4f68]">
                  已经开通？输入会员码激活
                </p>
                <p className="mt-1 text-sm leading-7 text-[#8a7b7f]">
                  激活后，会员有效期内可以无限整理历史主观题。
                </p>
              </div>
              <form
                onSubmit={handleMembershipActivation}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  value={membershipCode}
                  onChange={(event) => {
                    setMembershipCode(event.target.value);
                    setMembershipMessage("");
                  }}
                  placeholder="请输入会员码"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-h-[3.25rem] w-full rounded-full border border-[#efd9e2] bg-white/82 px-5 text-sm font-semibold uppercase tracking-[0.04em] text-[#57484e] outline-none transition placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-[#b6a8ac] focus:border-[#dfa0b8] focus:bg-white focus:shadow-[0_0_0_5px_rgba(235,166,190,0.16)]"
                />
                <button
                  type="submit"
                  disabled={!isStorageReady}
                  className="inline-flex min-h-[3.25rem] shrink-0 items-center justify-center rounded-full border border-[#e6cced] bg-[#f7efff] px-6 text-sm font-semibold text-[#8d62a5] shadow-[0_12px_26px_rgba(168,139,190,0.12)] transition hover:-translate-y-0.5 hover:bg-[#f3e8ff] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  激活会员
                </button>
              </form>
              {membershipMessage ? (
                <p className="mt-3 rounded-3xl bg-[#fff3f7] px-4 py-3 text-sm leading-7 text-[#a25c73] ring-1 ring-[#f2d5df]">
                  {membershipMessage}
                </p>
              ) : null}
            </section>
          </>
        )}

        <section className="rounded-[2.1rem] border border-white/75 bg-white/55 p-5 text-center shadow-[0_18px_55px_rgba(186,132,146,0.08)] backdrop-blur-xl sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a98996]">
            How Students Use It
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#493e42]">大家一般这样用它</h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {commonUses.map((use) => (
              <span
                key={use}
                className="rounded-full bg-[#fffaf7] px-4 py-2.5 text-sm font-medium text-[#846f76] shadow-[0_8px_20px_rgba(186,132,146,0.07)] ring-1 ring-[#eee0dc]"
              >
                {use}
              </span>
            ))}
          </div>
        </section>

        {toastMessage ? (
          <div className="fixed inset-x-4 bottom-5 z-20 mx-auto max-w-sm rounded-full bg-[#fff8fb] px-4 py-3 text-center text-sm font-semibold text-[#9f4f68] shadow-[0_18px_44px_rgba(186,132,146,0.18)] ring-1 ring-[#f1d8e2]">
            {toastMessage}
          </div>
        ) : null}
      </section>
    </main>
  );
}
