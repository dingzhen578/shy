export function getAIConfig(env = process.env) {
  return {
    apiKey: env.OPENAI_API_KEY || "",
    baseURL: env.OPENAI_BASE_URL || "https://api.deepseek.com",
    model: env.OPENAI_MODEL || "deepseek-v4-flash"
  };
}
