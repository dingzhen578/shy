export const OCR_IMAGE_FIELD_NAME = "image";
export const OCR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const OCR_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export const OCR_FAILURE_MESSAGE =
  "这张图片有点模糊，暂时没有识别成功。可以换一张更清晰的图片，或直接手动输入题目。";

const OCR_SYSTEM_PROMPT =
  "你是一个面向中国高中生的历史题目 OCR 助手。你的任务是从用户上传的试卷、练习册或笔记图片中识别历史主观题文字。只输出识别到的题目文字和必要材料文字，不要作答，不要解释，不要说自己是 AI。如果图片中有多道题，优先提取最清晰、最完整的一道历史主观题。尽量保留原题表达，去掉页眉页脚、广告、水印、无关批注和答案解析。";

export function isAllowedOcrImageType(mimeType) {
  return OCR_ALLOWED_MIME_TYPES.has(mimeType);
}

export function getOcrModel(env = process.env) {
  return env.OPENAI_OCR_MODEL || env.OPENAI_MODEL || "deepseek-v4-flash";
}

export function buildImageDataUrl(mimeType, base64Content) {
  return `data:${mimeType};base64,${base64Content}`;
}

export function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildOcrMessages(imageDataUrl) {
  return [
    {
      role: "system",
      content: OCR_SYSTEM_PROMPT
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "请识别图片中的高中历史主观题题目文字。只返回题目文字，不要生成答案。"
        },
        {
          type: "image_url",
          image_url: {
            url: imageDataUrl,
            detail: "high"
          }
        }
      ]
    }
  ];
}

export async function recognizeHistoryQuestionFromImage({
  client,
  model,
  imageDataUrl
}) {
  // OCR 服务调用集中在这里。当前使用 OpenAI SDK 兼容的视觉聊天接口；
  // 如果你后续改用专门 OCR 服务，只需要替换这个函数，不影响页面和 /api/ocr。
  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: buildOcrMessages(imageDataUrl)
  });

  return normalizeOcrText(completion.choices[0]?.message?.content);
}
