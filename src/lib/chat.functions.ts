import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  system: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
  model: z.string().min(1),
  fallbacks: z.array(z.string()).default([]),
});

export type ChatReply = { text: string; model: string; switched: boolean };

async function callModel(
  key: string,
  model: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model,
      stream: true,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        ...messages.map((m) => ({
          role: m.role,
          content: [
            m.role === "user"
              ? { type: "input_text", text: m.content }
              : { type: "output_text", text: m.content },
          ],
        })),
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}:${body.slice(0, 160)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && evt.response?.output_text && !text) {
          text = String(evt.response.output_text);
        }
      } catch {
        // ignore partial frames
      }
    }
  }

  if (!text.trim()) throw new Error("empty");
  return text;
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ChatReply> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("خدمة الذكاء الاصطناعي غير متاحة حالياً");

    const chain = [data.model, ...data.fallbacks.filter((m) => m !== data.model)];
    let lastError = "";

    for (const model of chain) {
      try {
        const text = await callModel(key, model, data.system, data.messages);
        return { text, model, switched: model !== data.model };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (lastError.startsWith("402")) throw new Error("رصيد الذكاء الاصطناعي خلص.");
      }
    }

    throw new Error(
      lastError.startsWith("429")
        ? "كل النماذج مشغولة دلوقتي، جرّب بعد شوية."
        : "تعذر الحصول على رد من أي نموذج، جرّب تاني.",
    );
  });
