import { ReplitConnectors } from "@replit/connectors-sdk";
import { desc, eq } from "drizzle-orm";
import {
  browserTasksTable,
  connectionActionsTable,
  consoleActivityTable,
  db,
  type ActivityStep,
} from "@workspace/db";
import { logger } from "./logger";

const connectors = new ReplitConnectors();
const repository = {
  owner: "aabbanoup-a11y",
  name: "AbanoupAi",
  branch: "main",
  lastCommit: "imported snapshot: 2026-09-26",
  files: 102,
};

type AssistantConfig = {
  id: string;
  name: string;
  role: string;
  model: string;
  fallbacks: string[];
  description: string;
  capabilities: string[];
  system: string;
};

export const assistants: AssistantConfig[] = [
  {
    id: "manager",
    name: "المدير المنسّق",
    role: "تنسيق المهام",
    model: "gpt-4.1-mini",
    fallbacks: ["gemini-2.5-flash"],
    description: "يقسّم الطلب إلى خطوات واضحة ويختار المساعد المناسب.",
    capabilities: ["تقسيم الطلب", "خطة مرقمة", "اختيار المساعد"],
    system: "أنت المدير المنسّق لفريق مساعدين. حلّل طلب المستخدم، اكتب إجابة عربية مصرية بسيطة، واذكر خطوات عملية مرقمة بدون مبالغة.",
  },
  {
    id: "study",
    name: "مساعد الدراسة",
    role: "الدراسة والمراجعة",
    model: "gemini-2.5-flash",
    fallbacks: ["gpt-4.1-mini"],
    description: "تلخيص ومراجعة وخطط مذاكرة لطالب أولى ثانوي في مصر.",
    capabilities: ["تلخيص", "شرح بأمثلة", "خطة مذاكرة"],
    system: "أنت مدرس خصوصي لطالب في الصف الأول الثانوي العام في مصر. اشرح ببساطة وبأمثلة، ورد بالعربية.",
  },
  {
    id: "karate",
    name: "مدرب الكاراتيه",
    role: "التدريب واللياقة",
    model: "gemini-2.5-flash",
    fallbacks: ["gpt-4.1-mini"],
    description: "برامج تدريب آمنة تشمل الإحماء والتكنيك والاستشفاء.",
    capabilities: ["إحماء", "تكنيك", "استشفاء آمن"],
    system: "أنت مدرب كاراتيه محترف. اقترح برامج آمنة لمراهق مع تنبيه واضح لتجنب الإصابة، ورد بالعربية.",
  },
  {
    id: "mind",
    name: "الصحة النفسية",
    role: "الدعم والتركيز",
    model: "gpt-4.1-mini",
    fallbacks: ["gemini-2.5-flash"],
    description: "دعم لطيف للتركيز وقلق الامتحانات وبناء العادات بدون تشخيص.",
    capabilities: ["تنظيم القلق", "تركيز", "عادات بدون تشخيص"],
    system: "أنت مرشد دعم نفسي داعم للمراهقين. لا تشخّص ولا تدّعي العلاج، واقترح خطوات صغيرة ورد بالعربية.",
  },
  {
    id: "body",
    name: "الصحة الجسدية",
    role: "التغذية والنوم",
    model: "gemini-2.5-flash",
    fallbacks: ["gpt-4.1-mini"],
    description: "نوم وترطيب وتغذية وتمارين مساندة عامة.",
    capabilities: ["نوم", "ترطيب", "تغذية عامة"],
    system: "أنت مرشد تغذية ولياقة عام لمراهق رياضي. اقترح خيارات بسيطة، ونبّه لاستشارة مختص عند وجود حالة طبية.",
  },
  {
    id: "research",
    name: "الباحث",
    role: "المصادر والتعليم",
    model: "gpt-4.1-mini",
    fallbacks: ["gemini-2.5-flash"],
    description: "ترشيح مصادر وكلمات بحث دقيقة.",
    capabilities: ["مصادر موثوقة", "كلمات بحث", "قائمة مرتبة"],
    system: "أنت باحث. رشّح مصادر تعليمية موثوقة واكتب كلمات بحث دقيقة بالعربية.",
  },
  {
    id: "wellness",
    name: "المزاج والراحة",
    role: "روتين وتهدئة",
    model: "gemini-2.5-flash",
    fallbacks: ["gpt-4.1-mini"],
    description: "تمارين تنفّس وترتيب أفكار وروتين صغير بدون تشخيص.",
    capabilities: ["تنفّس", "ترتيب أفكار", "روتين صغير بدون تشخيص"],
    system: "أنت مساعد دعم نفسي عام وداعم بالعربية المصرية. لا تشخّص، واقترح خطوة أو خطوتين عمليتين فقط.",
  },
];

export function getAssistant(id: string) {
  return assistants.find((assistant) => assistant.id === id) ?? assistants[0]!;
}

export function now() {
  return new Date().toISOString();
}

export function makeStep(label: string, status: string, detail?: string | null): ActivityStep {
  return { label, status, at: now(), detail };
}

export async function recordActivity(input: {
  id?: string;
  kind: string;
  title: string;
  status: string;
  detail?: string | null;
  model?: string | null;
  steps: ActivityStep[];
}) {
  const activity = {
    id: input.id ?? crypto.randomUUID(),
    kind: input.kind,
    title: input.title,
    status: input.status,
    detail: input.detail ?? null,
    model: input.model ?? null,
    createdAt: new Date(),
    steps: input.steps,
  };
  await db.insert(consoleActivityTable).values(activity);
  return activity;
}

export function activityResponse(activity: typeof consoleActivityTable.$inferSelect) {
  return {
    id: activity.id,
    kind: activity.kind,
    title: activity.title,
    status: activity.status,
    detail: activity.detail,
    model: activity.model,
    createdAt: activity.createdAt.toISOString(),
    steps: activity.steps,
  };
}

export async function listActivities(limit = 50) {
  const rows = await db
    .select()
    .from(consoleActivityTable)
    .orderBy(desc(consoleActivityTable.createdAt))
    .limit(limit);
  return rows.map(activityResponse);
}

export function connectionResponse(provider: string, status: string, capabilities: string[], note: string) {
  return { id: provider, provider, status, capabilities, note };
}

export async function listServiceConnections() {
  let githubStatus = "available";
  let githubNote = "سيظهر الاتصال الفعلي عند قراءة المستودع.";
  try {
    const rows = await connectors.listConnections({ connector_names: "github", refresh_policy: "none" });
    const connection = rows[0];
    if (connection) {
      githubStatus = connection.status ?? "connected";
      githubNote = "متصل عبر تكامل GitHub في بيئة Replit.";
    }
  } catch (error) {
    logger.warn({ err: error }, "GitHub connection status unavailable");
  }

  return [
    connectionResponse("github", githubStatus, ["read_repository", "write_file", "create_deployment"], githubNote),
    connectionResponse("supabase", "mcp-ready", ["review", "request_change"], "متاح للمراجعة عبر اتصال MCP؛ لا ينفّذ التطبيق تغييرات مباشرة بدون موافقة."),
    connectionResponse("cloudflare", "mcp-ready", ["review", "request_change", "publish"], "متاح للمراجعة عبر اتصال MCP؛ كل تغيير يبدأ كطلب انتظار وموافقة."),
  ];
}

export async function getRepositorySummary() {
  try {
    const response = await connectors.proxy("github", `/repos/${repository.owner}/${repository.name}`);
    if (!response.ok) throw new Error(`github repository ${response.status}`);
    const repo = (await response.json()) as { default_branch?: string; pushed_at?: string; size?: number };
    const treeResponse = await connectors.proxy(
      "github",
      `/repos/${repository.owner}/${repository.name}/git/trees/${repo.default_branch ?? repository.branch}?recursive=1`,
    );
    const tree = treeResponse.ok ? ((await treeResponse.json()) as { tree?: unknown[] }) : undefined;
    return {
      ...repository,
      branch: repo.default_branch ?? repository.branch,
      lastCommit: repo.pushed_at ?? repository.lastCommit,
      files: tree?.tree?.length ?? repository.files,
    };
  } catch (error) {
    logger.warn({ err: error }, "Using imported repository snapshot");
    return repository;
  }
}

export async function listConnectionActions() {
  const rows = await db
    .select()
    .from(connectionActionsTable)
    .orderBy(desc(connectionActionsTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    action: row.action,
    target: row.target,
    description: row.description,
    payload: row.payload,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  }));
}

export async function findConnectionAction(id: string) {
  const [row] = await db.select().from(connectionActionsTable).where(eq(connectionActionsTable.id, id));
  return row;
}

export function connectionActionResponse(row: typeof connectionActionsTable.$inferSelect) {
  return {
    id: row.id,
    provider: row.provider,
    action: row.action,
    target: row.target,
    description: row.description,
    payload: row.payload,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function listBrowserTasks() {
  const rows = await db
    .select()
    .from(browserTasksTable)
    .orderBy(desc(browserTasksTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    command: row.command,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    result: row.result,
    steps: row.steps,
  }));
}