import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { getAIConfig } from "./src/lib/aiConfig.js";
import { encouragements } from "./src/lib/encouragements.js";
import { buildHistoryPrompt } from "./src/lib/historyPrompt.js";

const sampleQuestions = [
  "评价洋务运动",
  "分析辛亥革命的历史意义",
  "说明新航路开辟的影响",
  "评价罗斯福新政"
];
const dailyFreeLimit = 3;

function loadLocalEnv() {
  if (!existsSync(".env.local")) {
    return;
  }

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);

const systemPrompt =
  "你是一个高考历史主观题答题助手，面向中国高中生，尤其是高二、高三文科生。请把用户输入的历史主观题整理成高考风格标准答案，固定使用以下结构：🌟 背景、📌 措施、📝 影响、⚠️ 局限性、✨ 历史意义。必须中文输出，每部分 80-140 字，最多 2 个分点，每个分点只写 1 句。语言要适合高中生背诵，使用历史学科术语，突出因果逻辑、阶段特征和评价角度。不要长篇大论，不要空泛鸡汤，不要说“作为 AI”，不要输出无关解释。如果题目不适合某一栏，可以写“此题重点不在该角度”。尽量避免编造明显错误史实。";

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      resolve(body);
    });

    request.on("error", reject);
  });
}

async function generateAnswer(question) {
  const aiConfig = getAIConfig(process.env);

  if (!aiConfig.apiKey) {
    throw new Error("服务暂时没有配置好，请检查 API Key。");
  }

  const response = await fetch(`${aiConfig.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: aiConfig.model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: buildHistoryPrompt(question)
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("DeepSeek request failed:", data);
    throw new Error("小助手刚刚走神了，请稍后再试一下。");
  }

  const answer = data.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("小助手刚刚走神了，请稍后再试一下。");
  }

  return answer;
}

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>历史学姐笔记 ✨</title>
  <style>
    :root {
      --cream: #fbf4ea;
      --paper: rgba(255, 250, 245, 0.92);
      --ink: #30282b;
      --muted: #7b6f73;
      --rose: #d883a2;
      --rose-deep: #a95570;
      --lavender: #c7a6ee;
      --line: rgba(214, 163, 177, 0.22);
      --shadow: 0 24px 70px rgba(186, 132, 146, 0.14);
    }

    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      overflow-x: hidden;
      background:
        radial-gradient(circle at top left, rgba(255, 219, 231, 0.78), transparent 32rem),
        radial-gradient(circle at top right, rgba(234, 220, 255, 0.72), transparent 30rem),
        linear-gradient(180deg, #fffaf3 0%, var(--cream) 48%, #f8efe3 100%);
      color: var(--ink);
      font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
    }

    main {
      width: min(100%, 820px);
      margin: 0 auto;
      padding: 20px 16px 44px;
    }

    .hero,
    .card {
      border: 1px solid rgba(255, 255, 255, 0.76);
      border-radius: 34px;
      background: rgba(255, 250, 245, 0.88);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }

    .hero {
      padding: 30px 20px;
      text-align: center;
    }

    .eyebrow {
      margin: 0 0 12px;
      color: #c06d87;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: clamp(40px, 12vw, 62px);
      line-height: 1;
    }

    .subtitle {
      margin: 18px auto 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.9;
    }

    .description {
      max-width: 560px;
      margin: 8px auto 0;
      color: #8a7b7f;
      font-size: 14px;
      line-height: 1.85;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
    }

    .chips span {
      border: 1px solid #f1dce3;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      color: #9c7480;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .card {
      margin-top: 20px;
      padding: 18px;
    }

    label {
      display: block;
      color: #473c40;
      font-size: 14px;
      font-weight: 700;
    }

    .label-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .label-row span {
      display: none;
      color: #ad8f98;
      font-size: 12px;
    }

    textarea {
      width: 100%;
      min-height: 176px;
      resize: vertical;
      border: 1px solid #efd9d1;
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.82);
      color: #332b2e;
      padding: 16px;
      font: inherit;
      font-size: 16px;
      line-height: 2;
      outline: none;
      transition: 160ms ease;
    }

    textarea:focus {
      border-color: #e6a0b6;
      background: white;
      box-shadow: 0 0 0 5px rgba(235, 166, 190, 0.18);
    }

    .samples {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      padding-bottom: 4px;
      overflow-x: auto;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .sample-title {
      margin: 12px 0 0;
      color: #9f4f68;
      font-size: 14px;
      font-weight: 700;
    }

    .samples::-webkit-scrollbar {
      display: none;
    }

    .sample-question {
      min-height: 0;
      flex: 0 0 auto;
      border: 1px solid #f0d9df;
      background: rgba(255, 255, 255, 0.72);
      color: #9b6677;
      padding: 8px 14px;
      font-size: 12px;
      box-shadow: none;
    }

    .sample-question:hover {
      background: #fff5fb;
      box-shadow: 0 10px 22px rgba(210, 135, 176, 0.12);
    }

    .quota-pill {
      border: 1px solid #f6dec0;
      border-radius: 999px;
      background: #fff0dc;
      color: #b56f46;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 16px;
    }

    .hint {
      margin: 0;
      color: #8a7b7f;
      font-size: 14px;
      line-height: 1.8;
    }

    button {
      min-height: 52px;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, #f0a8c3 0%, var(--lavender) 100%);
      color: white;
      padding: 0 28px;
      font: inherit;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 18px 34px rgba(210, 135, 176, 0.28);
      transition: 180ms ease;
    }

    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 20px 42px rgba(210, 135, 176, 0.34);
    }

    button:active {
      transform: scale(0.98);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
      transform: none;
    }

    .output {
      min-height: 320px;
      padding: 22px;
    }

    .output-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
    }

    .output-head p {
      margin: 0 0 4px;
      color: #c06d87;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      font-size: 24px;
    }

    .badge {
      border: 1px solid #f6dec0;
      border-radius: 999px;
      background: #fff0dc;
      color: #b56f46;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    .message,
    .answer {
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.72);
      padding: 28px 18px;
      color: #7d7175;
      line-height: 1.9;
      box-shadow: inset 0 0 0 1px rgba(240, 226, 221, 0.9);
    }

    .message {
      text-align: center;
    }

    .error {
      border: 1px solid #f3c8c8;
      background: #fff4f4;
      color: #a45151;
      text-align: left;
    }

    .pay-card {
      border: 1px solid #f2d4df;
      border-radius: 34px;
      background: rgba(255, 248, 251, 0.95);
      padding: 22px;
      box-shadow: 0 22px 65px rgba(186, 132, 146, 0.13);
      backdrop-filter: blur(18px);
    }

    .pay-card h2 {
      color: #9f4f68;
      font-size: 20px;
    }

    .pay-card p {
      color: #7b6f73;
      font-size: 14px;
      line-height: 2;
    }

    .plans {
      display: grid;
      gap: 12px;
      margin-top: 14px;
    }

    .plan {
      border: 1px solid #f2d8df;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.75);
      padding: 16px;
    }

    .price {
      margin: 4px 0 0;
      color: #b75f7a;
      font-size: 26px;
      font-weight: 700;
    }

    .contact-box {
      margin-top: 16px;
      border: 1px dashed #e8c7d2;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.6);
      color: #9b7e87;
      padding: 18px;
      text-align: center;
      font-size: 14px;
      line-height: 1.9;
    }

    .encouragement {
      margin: 0 0 16px;
      border: 1px solid #f4d7e3;
      border-radius: 24px;
      background: #fff5fb;
      color: #9a6474;
      padding: 12px 16px;
      font-size: 14px;
      line-height: 1.8;
    }

    .answer-grid {
      display: grid;
      gap: 12px;
    }

    .section-card {
      border: 1px solid #f2e2dc;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.78);
      padding: 16px;
      box-shadow: 0 12px 32px rgba(186, 132, 146, 0.1);
    }

    .section-card h3 {
      margin: 0 0 12px;
      color: #9f4f68;
      font-size: 15px;
    }

    .section-card p {
      margin: 8px 0 0;
      color: #463d3f;
      font-size: 15px;
      line-height: 2;
    }

    .answer strong {
      color: #b75f7a;
      font-weight: 800;
    }

    .export-card {
      background: #fffdf9;
      padding: 20px;
    }

    .export-head {
      margin-bottom: 16px;
      border-bottom: 1px solid #f1ded8;
      padding-bottom: 16px;
    }

    .export-head p {
      margin: 0;
      color: #c06d87;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .export-head h3 {
      margin: 4px 0 0;
      color: #b75f7a;
      font-size: 20px;
    }

    .export-foot {
      margin: 20px 0 0;
      border-top: 1px solid #f1ded8;
      padding-top: 16px;
      color: #b75f7a;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
    }

    .answer-actions {
      display: grid;
      gap: 12px;
      margin-top: 16px;
    }

    .secondary-button {
      width: 100%;
      border: 1px solid #ead0da;
      background: rgba(255, 255, 255, 0.78);
      color: #9f4f68;
      box-shadow: 0 14px 28px rgba(186, 132, 146, 0.12);
    }

    .secondary-button:hover {
      background: #fff5fb;
    }

    .toast {
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: 20px;
      z-index: 20;
      max-width: 380px;
      margin: 0 auto;
      border: 1px solid #f1d8e2;
      border-radius: 999px;
      background: #fff8fb;
      color: #9f4f68;
      padding: 12px 16px;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 18px 44px rgba(186, 132, 146, 0.18);
    }

    @media (min-width: 640px) {
      main {
        padding-top: 42px;
      }

      .hero {
        padding: 42px 32px;
      }

      .card {
        padding: 26px;
      }

      .actions {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      .label-row span {
        display: inline;
      }

      .plans {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .answer-actions {
        display: flex;
        flex-wrap: wrap;
      }

      .secondary-button {
        width: auto;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <p class="eyebrow">Study Notebook</p>
      <h1>历史学姐笔记 ✨</h1>
      <p class="subtitle">把历史主观题整理成高考答案</p>
      <p class="description">输入一道历史题，自动生成背景、措施、影响、局限性和历史意义。</p>
      <div class="chips">
        <span>主观题整理</span>
        <span>高考表达</span>
        <span>适合背诵</span>
        <span class="quota-pill">今日剩余免费次数：<strong id="remainingHero">${dailyFreeLimit}</strong>/${dailyFreeLimit}</span>
      </div>
    </section>

    <form class="card" id="form">
      <div class="label-row">
        <label for="question">今天想整理哪一道历史题？</label>
        <span>先写题目，再让学姐整理</span>
      </div>
      <textarea id="question" placeholder="例如：评价洋务运动"></textarea>
      <p class="sample-title">试试这些题目</p>
      <div class="samples" id="samples"></div>
      <div class="actions">
        <p class="hint">今日剩余免费次数：<strong id="remainingHint">${dailyFreeLimit}</strong>/${dailyFreeLimit}</p>
        <button id="submit" type="submit">帮我整理答案</button>
      </div>
    </form>

    <section class="pay-card" id="payCard" hidden>
      <h2>今天的免费次数用完啦 ✨</h2>
      <p>如果你觉得这个工具对历史复习有帮助，可以开通体验版：</p>
      <div class="plans">
        <div class="plan">
          <p>7天体验</p>
          <p class="price">9.9元</p>
        </div>
        <div class="plan">
          <p>月卡</p>
          <p class="price">19元</p>
        </div>
      </div>
      <p>开通后可继续生成历史主观题学习笔记。</p>
      <button type="button">联系我开通</button>
      <div class="contact-box">
        QQ / 微信 / 二维码图片<br />
        请在这里放置你的 QQ / 微信 / 二维码。
      </div>
    </section>

    <section class="card output" aria-live="polite">
      <div class="output-head">
        <div>
          <p>Notebook Card</p>
          <h2>学姐整理好的答案</h2>
        </div>
        <span class="badge">可截图</span>
      </div>
      <div id="result" class="message">整理后的答案会出现在这里，像一张干净的复习手账卡片。</div>
    </section>
    <div id="toast" class="toast" hidden></div>
  </main>

  <script src="/vendor/html2canvas.min.js"></script>
  <script>
    const encouragements = ${JSON.stringify(encouragements)};
    const sampleQuestions = ${JSON.stringify(sampleQuestions)};
    const dailyFreeLimit = ${dailyFreeLimit};
    const usageStorageKey = "history-senior-notes-free-usage";
    const form = document.querySelector("#form");
    const question = document.querySelector("#question");
    const submit = document.querySelector("#submit");
    const result = document.querySelector("#result");
    const samples = document.querySelector("#samples");
    const payCard = document.querySelector("#payCard");
    const remainingHero = document.querySelector("#remainingHero");
    const remainingHint = document.querySelector("#remainingHint");
    const toast = document.querySelector("#toast");
    const answerSections = [
      { id: "background", label: "🌟 背景", fallback: "此题重点不在该角度。" },
      { id: "measures", label: "📌 措施", fallback: "此题重点不在该角度。" },
      { id: "impact", label: "📝 影响", fallback: "此题重点不在该角度。" },
      { id: "limits", label: "⚠️ 局限性", fallback: "此题重点不在该角度。" },
      { id: "meaning", label: "✨ 历史意义", fallback: "此题重点不在该角度。" }
    ];

    function escapeHtml(value) {
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function getTodayKey() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      return year + "-" + month + "-" + day;
    }

    function readUsage() {
      const today = getTodayKey();

      try {
        const rawUsage = localStorage.getItem(usageStorageKey);

        if (!rawUsage) {
          return { date: today, remaining: dailyFreeLimit };
        }

        const usage = JSON.parse(rawUsage);

        if (usage.date !== today || typeof usage.remaining !== "number") {
          return { date: today, remaining: dailyFreeLimit };
        }

        return {
          date: today,
          remaining: Math.min(dailyFreeLimit, Math.max(0, usage.remaining))
        };
      } catch {
        return { date: today, remaining: dailyFreeLimit };
      }
    }

    function saveUsage(usage) {
      localStorage.setItem(usageStorageKey, JSON.stringify(usage));
    }

    function updateQuotaView(usage) {
      remainingHero.textContent = String(usage.remaining);
      remainingHint.textContent = String(usage.remaining);
      payCard.hidden = usage.remaining > 0;
      submit.disabled = usage.remaining <= 0;
    }

    function decrementUsage() {
      const usage = readUsage();
      const nextUsage = {
        date: getTodayKey(),
        remaining: Math.max(0, usage.remaining - 1)
      };

      saveUsage(nextUsage);
      updateQuotaView(nextUsage);
    }

    const initialUsage = readUsage();
    saveUsage(initialUsage);
    updateQuotaView(initialUsage);

    samples.innerHTML = sampleQuestions
      .map((sampleQuestion) => '<button class="sample-question" type="button">' + escapeHtml(sampleQuestion) + "</button>")
      .join("");

    samples.addEventListener("click", (event) => {
      if (!(event.target instanceof HTMLButtonElement)) {
        return;
      }

      question.value = event.target.textContent || "";
      question.focus();
    });

    function inlineMarkdown(value) {
      return escapeHtml(value).replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>");
    }

    function randomEncouragement() {
      return encouragements[Math.floor(Math.random() * encouragements.length)];
    }

    function getSectionName(label) {
      return label.replace(/^[^\\s]+\\s*/, "");
    }

    function parseAnswerSections(markdown) {
      const sectionLines = new Map(answerSections.map((section) => [section.id, []]));
      let currentSectionId = null;

      for (const rawLine of markdown.split("\\n")) {
        const line = rawLine.trim();

        if (!line) {
          continue;
        }

        const normalizedLine = line.replace(/^#{1,6}\\s*/, "");
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
        lines: sectionLines.get(section.id) || []
      }));
    }

    function renderMarkdown(markdown) {
      let html = '<div id="exportCard" class="answer export-card">';
      html += '<div class="export-head"><p>历史学姐笔记</p><h3>主观题学习卡片</h3></div>';
      html += '<p class="encouragement">' + escapeHtml(randomEncouragement()) + "</p>";
      html += '<div class="answer-grid">';

      for (const section of parseAnswerSections(markdown)) {
        const lines = section.lines.length > 0 ? section.lines : [section.fallback];

        html += '<section class="section-card"><h3>' + escapeHtml(section.label) + "</h3>";
        for (const line of lines) {
          const bullet = line.match(/^[-*]\\s+(.+)$/);
          const content = bullet ? bullet[1] : line;
          html += "<p>" + inlineMarkdown(content) + "</p>";
        }
        html += "</section>";
      }

      html += "</div>";
      html += '<p class="export-foot">历史学姐笔记 ✨</p>';
      html += "</div>";
      html += '<div class="answer-actions">';
      html += '<button id="copyButton" class="secondary-button" type="button">复制这份笔记</button>';
      html += '<button id="saveButton" class="secondary-button" type="button">保存为学习卡片图</button>';
      html += "</div>";
      return html;
    }

    function showToast(message) {
      toast.textContent = message;
      toast.hidden = false;
      window.setTimeout(() => {
        toast.hidden = true;
      }, 2600);
    }

    async function copyNotebookAnswer(markdown) {
      try {
        await navigator.clipboard.writeText(markdown);
        showToast("已经复制好啦，可以放进你的错题本里 ✨");
      } catch (error) {
        console.error("Failed to copy notebook answer:", error);
        showToast("复制暂时失败，请稍后再试一下。");
      }
    }

    async function saveNotebookImage() {
      const exportCard = document.querySelector("#exportCard");
      const saveButton = document.querySelector("#saveButton");

      if (!exportCard || !window.html2canvas) {
        return;
      }

      saveButton.disabled = true;
      saveButton.textContent = "正在生成图片...";

      try {
        const canvas = await window.html2canvas(exportCard, {
          backgroundColor: "#fffaf5",
          scale: Math.min(3, window.devicePixelRatio || 2),
          useCORS: true
        });
        const link = document.createElement("a");

        link.href = canvas.toDataURL("image/png");
        link.download = "历史学姐笔记-" + getTodayKey() + ".png";
        link.click();
      } catch (error) {
        console.error("Failed to save notebook image:", error);
        result.className = "message error";
        result.textContent = "学习卡片暂时保存失败，请稍后再试一下。";
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "保存为学习卡片图";
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const value = question.value.trim();
      const usage = readUsage();
      if (!value) {
        result.className = "message error";
        result.textContent = "先写一道历史题目吧，例如：评价洋务运动。";
        return;
      }

      if (usage.remaining <= 0) {
        updateQuotaView(usage);
        return;
      }

      submit.disabled = true;
      submit.textContent = "正在整理中...";
      result.className = "message";
      result.textContent = "小助手正在认真整理答案，请稍等一下 ✨";

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: value })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "小助手刚刚走神了，请稍后再试一下。");
        }

        result.className = "";
        result.innerHTML = renderMarkdown(data.answer);
        decrementUsage();

        document.querySelector("#copyButton")?.addEventListener("click", () => copyNotebookAnswer(data.answer));
        document.querySelector("#saveButton")?.addEventListener("click", saveNotebookImage);
      } catch (error) {
        result.className = "message error";
        result.textContent = error.message || "小助手刚刚走神了，请稍后再试一下。";
      } finally {
        submit.disabled = readUsage().remaining <= 0;
        submit.textContent = "帮我整理答案";
      }
    });
  </script>
</body>
</html>`;

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/vendor/html2canvas.min.js") {
    try {
      const script = readFileSync("node_modules/html2canvas/dist/html2canvas.min.js");

      response.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8"
      });
      response.end(script);
    } catch (error) {
      console.error("Failed to serve html2canvas:", error);
      json(response, 404, { error: "资源不存在。" });
    }
    return;
  }

  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });
    response.end(html);
    return;
  }

  if (request.method === "POST" && request.url === "/api/generate") {
    try {
      const body = JSON.parse(await readBody(request));
      const question = typeof body.question === "string" ? body.question.trim() : "";

      if (!question) {
        json(response, 400, { error: "先写一道历史题目吧，例如：评价洋务运动。" });
        return;
      }

      const answer = await generateAnswer(question);
      json(response, 200, { answer });
    } catch (error) {
      const message =
        error instanceof Error && error.message === "服务暂时没有配置好，请检查 API Key。"
          ? error.message
          : "小助手刚刚走神了，请稍后再试一下。";

      console.error("Local HTTP server request failed:", error);
      json(response, 500, { error: message });
    }
    return;
  }

  json(response, 404, { error: "页面不存在。" });
});

server.listen(port, host, () => {
  console.log(`历史学姐笔记已启动：http://${host}:${port}`);
});
