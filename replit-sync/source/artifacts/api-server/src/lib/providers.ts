import { logger } from "./logger";

type Message = { role: "user" | "assistant"; content: string };

type ProviderInput = {
  model: string;
  system: string;
  message: string;
  history: Message[];
};

function openAiModel(model: string) {
  return model.startsWith("openai/") ? model.slice("openai/".length) : model;
}

async function callOpenAi(input: ProviderInput, key: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: openAiModel(input.model),
      messages: [
        { role: "system", content: input.system },
        ...input.history,
        { role: "user", content: input.message },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`openai:${response.status}`);
  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("openai:empty");
  return text;
}

async function callGemini(input: ProviderInput, key: string) {
  const model = input.model.replace(/^google\//, "");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [
          ...input.history.map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content }],
          })),
          { role: "user", parts: [{ text: input.message }] },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!response.ok) throw new Error(`gemini:${response.status}`);
  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("gemini:empty");
  return text;
}

export async function runModel(input: ProviderInput) {
  const isGemini = input.model.startsWith("gemini-") || input.model.startsWith("google/");
  const key = isGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(isGemini ? "GEMINI_API_KEY is not configured" : "OPENAI_API_KEY is not configured");
  }
  try {
    return isGemini ? await callGemini(input, key) : await callOpenAi(input, key);
  } catch (error) {
    logger.warn({ err: error, model: input.model }, "Model request failed");
    throw error;
  }
}