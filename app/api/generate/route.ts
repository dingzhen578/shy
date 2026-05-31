import OpenAI from "openai";
import { getAIConfig } from "@/src/lib/aiConfig";
import { buildHistoryPrompt } from "@/src/lib/historyPrompt";

export const runtime = "nodejs";
export const maxDuration = 30;

type GenerateRequest = {
  question?: unknown;
};

const SYSTEM_PROMPT =
  "你是一个高考历史主观题答题助手，面向中国高中生，尤其是高二、高三文科生。请把用户输入的历史主观题整理成高考风格标准答案，固定使用以下结构：🌟 背景、📌 措施、📝 影响、⚠️ 局限性、✨ 历史意义。必须中文输出，每部分 80-140 字，最多 2 个分点，每个分点只写 1 句。语言要适合高中生背诵，使用历史学科术语，突出因果逻辑、阶段特征和评价角度。不要长篇大论，不要空泛鸡汤，不要说“作为 AI”，不要输出无关解释。如果题目不适合某一栏，可以写“此题重点不在该角度”。尽量避免编造明显错误史实。";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return Response.json(
        { error: "请输入历史主观题。" },
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

    const client = new OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL
    });

    const completion = await client.chat.completions.create({
      model: aiConfig.model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: buildHistoryPrompt(question)
        }
      ]
    });

    const answer = completion.choices[0]?.message?.content?.trim();

    if (!answer) {
      return Response.json(
        { error: "小助手刚刚走神了，请稍后再试一下。" },
        { status: 502 }
      );
    }

    return Response.json({ answer });
  } catch (error) {
    console.error("Failed to generate history notebook answer:", error);

    return Response.json(
      { error: "小助手刚刚走神了，请稍后再试一下。" },
      { status: 500 }
    );
  }
}
