import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send, Users2, Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { askAssistant } from "@/lib/chat.functions";
import {
  ASSISTANTS,
  MODELS,
  DEFAULT_MODEL,
  QUICK_LINKS,
  getAssistant,
  type AssistantKey,
} from "@/lib/assistants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/assistant")({
  component: AssistantPage,
  head: () => ({
    meta: [
      { title: "فريق المساعدين الأذكياء — دراسة وكاراتيه وصحة" },
      {
        name: "description",
        content:
          "ستة مساعدين ذكاء اصطناعي: مدير منسّق، مذاكرة أولى ثانوي، مدرب كاراتيه، صحة نفسية وجسدية، وباحث مصادر — مع نماذج بديلة تتبدّل تلقائياً.",
      },
      { property: "og:title", content: "فريق المساعدين الأذكياء" },
      {
        property: "og:description",
        content: "مساعدين للدراسة والكاراتيه والصحة، بنماذج ذكاء اصطناعي متعددة وبدائل تلقائية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string; author?: string; model?: string };

function AssistantPage() {
  const [active, setActive] = useState<AssistantKey>("manager");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [teamMode, setTeamMode] = useState(false);
  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useServerFn(askAssistant);
  const assistant = getAssistant(active);
  const key = teamMode ? "team" : active;
  const messages = threads[key] ?? [];

  const push = (k: string, msg: Msg) =>
    setThreads((t) => ({ ...t, [k]: [...(t[k] ?? []), msg] }));

  // "auto" = كل مساعد يستخدم النموذج المخصص له.
  const modelFor = (a: { model: string }) => (model === "auto" ? a.model : model);
  const scroll = () =>
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));

  const runOne = async (
    a: ReturnType<typeof getAssistant>,
    thread: string,
    msgs: { role: "user" | "assistant"; content: string }[],
    prompt: string,
  ) => {
    const m = modelFor(a);
    try {
      const reply = await ask({ data: { system: a.system, model: m, fallbacks: chainFor(m), messages: msgs } });
      push(thread, { role: "assistant", content: reply.text, author: `${a.emoji} ${a.name}`, model: reply.model });
      notifyDone(`${a.emoji} ${a.name} خلّص المهمة`, reply.text);
      void logRun({ agent_kind: thread === "team" ? "team" : "assistant", agent_key: a.key, agent_name: a.name, model: reply.model, prompt, reply: reply.text, status: "done" });
      scroll();
      return reply;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حصل خطأ";
      push(thread, { role: "assistant", content: `⚠️ ${msg}`, author: `${a.emoji} ${a.name}` });
      notifyDone(`${a.name} ما قدرش يكمّل`, msg, false);
      void logRun({ agent_kind: thread === "team" ? "team" : "assistant", agent_key: a.key, agent_name: a.name, model: m, prompt, reply: msg, status: "error" });
      scroll();
      return null;
    }
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    requestNotifyPermission();
    setInput("");
    push(key, { role: "user", content: q });
    setLoading(true);

    try {
      if (teamMode) {
        const history = (threads["team"] ?? []).slice(-4).map(strip);
        const plan = await runOne(getAssistant("manager"), "team", [...history, { role: "user", content: q }], q);
        const crew = ASSISTANTS.filter((a) => a.key !== "manager");
        // كل مساعد يظهر رده أول ما يخلص، بالتوازي.
        await Promise.all(
          crew.map((a) =>
            runOne(a, "team", [{ role: "user", content: `طلب المستخدم: ${q}\n\nخطة المدير:\n${plan?.text ?? "(غير متاحة)"}\n\nنفّذ الجزء الخاص بتخصصك فقط في 5 نقاط عملية قصيرة.` }], q),
          ),
        );
        notifyDone("الفريق خلّص كل المهام", q);
      } else {
        const history = (threads[key] ?? []).slice(-6).map(strip);
        await runOne(assistant, key, [...history, { role: "user", content: q }], q);
      }
    } finally {
      setLoading(false);
      scroll();
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Badge className="mb-2">نماذج متعددة + بدائل تلقائية</Badge>
              <h1 className="text-2xl font-bold sm:text-3xl">فريق المساعدين الأذكياء</h1>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                الموظفين
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {MODELS.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant={model === m.id ? "default" : "outline"}
                onClick={() => setModel(m.id)}
                title={m.note}
              >
                {m.label}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground">
              لو النموذج مشغول بيتحول للبديل لوحده
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={teamMode ? "default" : "outline"}
            onClick={() => setTeamMode(true)}
          >
            <Users2 className="size-4" />
            وضع الفريق
          </Button>
          {ASSISTANTS.map((a) => (
            <Button
              key={a.key}
              size="sm"
              variant={!teamMode && active === a.key ? "default" : "outline"}
              onClick={() => {
                setTeamMode(false);
                setActive(a.key);
              }}
            >
              <span>{a.emoji}</span>
              {a.name}
            </Button>
          ))}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {teamMode
            ? "المدير يقسّم طلبك، وكل مساعد ينفّذ جزءه في نفس الوقت."
            : assistant.tagline}
        </p>

        {messages.length === 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" />
              جرّب تبدأ بـ
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(teamMode
                ? ["اعملي خطة أطلع الأول في الدراسة والكاراتيه", "نظّم أسبوعي بالكامل"]
                : assistant.starters
              ).map((s) => (
                <Button key={s} size="sm" variant="secondary" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ms-auto max-w-[85%] rounded-xl bg-primary px-4 py-3 text-primary-foreground"
                  : "max-w-[92%] rounded-xl border border-border bg-card px-4 py-3"
              }
            >
              {m.author && (
                <p className="mb-1 text-xs font-semibold text-primary">
                  {m.author}
                  {m.model ? ` · ${m.model}` : ""}
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm leading-7">{m.content}</p>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              بيشتغل على طلبك...
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 mt-6 bg-background/95 py-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="اكتب طلبك هنا..."
            />
            <Button onClick={() => send(input)} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
            {messages.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setThreads((t) => ({ ...t, [key]: [] }))}
                aria-label="مسح المحادثة"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.url(input.trim() || "منهج أولى ثانوي")}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {l.emoji} {l.label}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function strip(m: Msg) {
  return { role: m.role, content: m.content };
}
