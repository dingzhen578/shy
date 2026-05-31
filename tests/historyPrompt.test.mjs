import test from "node:test";
import assert from "node:assert/strict";

import { getAIConfig } from "../src/lib/aiConfig.js";
import { encouragements } from "../src/lib/encouragements.js";
import { buildHistoryPrompt } from "../src/lib/historyPrompt.js";

test("buildHistoryPrompt creates a notebook-style gaokao answer request", () => {
  const question = "评价洋务运动";

  const prompt = buildHistoryPrompt(question);

  assert.match(prompt, /历史学姐笔记/);
  assert.match(prompt, /🌟 背景/);
  assert.match(prompt, /📌 措施/);
  assert.match(prompt, /📝 影响/);
  assert.match(prompt, /⚠️ 局限性/);
  assert.match(prompt, /✨ 历史意义/);
  assert.match(prompt, /80-140 字/);
  assert.match(prompt, /最多 2 个分点/);
  assert.match(prompt, /不要长篇大论/);
  assert.match(prompt, /中文/);
  assert.match(prompt, /简洁/);
  assert.match(prompt, /便于背诵/);
  assert.match(prompt, new RegExp(question));
});

test("buildHistoryPrompt trims the question before embedding it", () => {
  const prompt = buildHistoryPrompt("  评价辛亥革命的历史作用。  ");

  assert.match(prompt, /评价辛亥革命的历史作用。/);
  assert.doesNotMatch(prompt, /  评价辛亥革命/);
});

test("getAIConfig defaults to DeepSeek compatible OpenAI settings", () => {
  const config = getAIConfig({});

  assert.equal(config.baseURL, "https://api.deepseek.com");
  assert.equal(config.model, "deepseek-v4-flash");
  assert.equal(config.apiKey, "");
});

test("getAIConfig reads every model setting from environment variables", () => {
  const config = getAIConfig({
    OPENAI_API_KEY: "test-deepseek-key",
    OPENAI_BASE_URL: "https://example.deepseek.test",
    OPENAI_MODEL: "custom-model"
  });

  assert.equal(config.apiKey, "test-deepseek-key");
  assert.equal(config.baseURL, "https://example.deepseek.test");
  assert.equal(config.model, "custom-model");
});

test("encouragements includes at least 20 gentle notebook messages", () => {
  assert.ok(encouragements.length >= 20);
  assert.ok(encouragements.every((message) => message.length >= 8));
});
