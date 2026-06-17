import test from "node:test";
import assert from "node:assert/strict";

import {
  OCR_FAILURE_MESSAGE,
  OCR_MAX_FILE_SIZE_BYTES,
  buildImageDataUrl,
  buildOcrMessages,
  getOcrModel,
  isAllowedOcrImageType,
  normalizeOcrText
} from "../src/lib/ocr.js";

test("OCR image validation accepts only supported MVP image formats", () => {
  assert.equal(isAllowedOcrImageType("image/jpeg"), true);
  assert.equal(isAllowedOcrImageType("image/png"), true);
  assert.equal(isAllowedOcrImageType("image/webp"), true);
  assert.equal(isAllowedOcrImageType("image/gif"), false);
  assert.equal(isAllowedOcrImageType("application/pdf"), false);
});

test("OCR file size limit is 5MB", () => {
  assert.equal(OCR_MAX_FILE_SIZE_BYTES, 5 * 1024 * 1024);
});

test("OCR model can be configured separately and falls back to the answer model", () => {
  assert.equal(getOcrModel({}), "deepseek-v4-flash");
  assert.equal(
    getOcrModel({ OPENAI_MODEL: "deepseek-answer-model" }),
    "deepseek-answer-model"
  );
  assert.equal(
    getOcrModel({
      OPENAI_MODEL: "deepseek-answer-model",
      OPENAI_OCR_MODEL: "vision-ocr-model"
    }),
    "vision-ocr-model"
  );
});

test("OCR prompt asks for text extraction without answering the question", () => {
  const imageDataUrl = buildImageDataUrl("image/png", "ZmFrZQ==");
  const messages = buildOcrMessages(imageDataUrl);

  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /只输出识别到的题目文字/);
  assert.match(messages[0].content, /不要作答/);
  assert.equal(messages[1].content[1].image_url.url, imageDataUrl);
});

test("normalizeOcrText trims noisy whitespace", () => {
  assert.equal(
    normalizeOcrText("  评价洋务运动。\r\n\n\n  说明其历史影响。  "),
    "评价洋务运动。\n\n  说明其历史影响。"
  );
});

test("OCR failure message stays user friendly", () => {
  assert.match(OCR_FAILURE_MESSAGE, /图片/);
  assert.doesNotMatch(OCR_FAILURE_MESSAGE, /stack|Error|exception/i);
});
