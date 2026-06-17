import OpenAI from "openai";
import { getAIConfig } from "@/src/lib/aiConfig";
import {
  OCR_FAILURE_MESSAGE,
  OCR_IMAGE_FIELD_NAME,
  OCR_MAX_FILE_SIZE_BYTES,
  buildImageDataUrl,
  getOcrModel,
  isAllowedOcrImageType,
  recognizeHistoryQuestionFromImage
} from "@/src/lib/ocr";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return Response.json(
        { error: "请上传题目图片。" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const image = formData.get(OCR_IMAGE_FIELD_NAME);

    if (!(image instanceof File)) {
      return Response.json(
        { error: "请上传题目图片。" },
        { status: 400 }
      );
    }

    if (!isAllowedOcrImageType(image.type)) {
      return Response.json(
        { error: "请上传 jpg、jpeg、png 或 webp 格式的图片。" },
        { status: 400 }
      );
    }

    if (image.size > OCR_MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: "图片太大啦，请上传 5MB 以内的图片。" },
        { status: 400 }
      );
    }

    const aiConfig = getAIConfig(process.env);

    if (!aiConfig.apiKey) {
      return Response.json(
        { error: "服务暂时没有配置好，请检查 API Key。" },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const imageDataUrl = buildImageDataUrl(
      image.type,
      imageBuffer.toString("base64")
    );
    const client = new OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL
    });

    const text = await recognizeHistoryQuestionFromImage({
      client,
      model: getOcrModel(process.env),
      imageDataUrl
    });

    if (!text) {
      return Response.json(
        { error: OCR_FAILURE_MESSAGE },
        { status: 422 }
      );
    }

    return Response.json({ text });
  } catch (error) {
    console.error("Failed to recognize history question image:", error);

    return Response.json(
      { error: OCR_FAILURE_MESSAGE },
      { status: 500 }
    );
  }
}
