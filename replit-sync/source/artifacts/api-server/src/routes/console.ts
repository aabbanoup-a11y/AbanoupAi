import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  CreateBrowserTaskBody,
  CreateBrowserTaskResponse,
  CreateConnectionActionBody,
  CreateConnectionActionResponse,
  GetOverviewResponse,
  ListActivityQueryParams,
  ListActivityResponse,
  ListAssistantsResponse,
  ListBrowserTasksResponse,
  ListConnectionActionsResponse,
  ListConnectionsResponse,
  RunChatBody,
  RunChatResponse,
} from "@workspace/api-zod";
import {
  browserTasksTable,
  connectionActionsTable,
  consoleActivityTable,
  db,
} from "@workspace/db";
import {
  activityResponse,
  assistants,
  connectionActionResponse,
  findConnectionAction,
  getAssistant,
  getRepositorySummary,
  listActivities,
  listBrowserTasks,
  listConnectionActions,
  listServiceConnections,
  makeStep,
  now,
  recordActivity,
} from "../lib/console-data";
import { runModel } from "../lib/providers";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/overview", async (_req, res): Promise<void> => {
  const [repository, services, latestActivity, actions, browserTasks] = await Promise.all([
    getRepositorySummary(),
    listServiceConnections(),
    listActivities(10),
    listConnectionActions(),
    listBrowserTasks(),
  ]);
  const data = {
    repository,
    assistants: assistants.length,
    services: services.length,
    totals: {
      tasks: latestActivity.length,
      completed: latestActivity.filter((activity) => activity.status === "completed").length,
      pendingApprovals: actions.filter((action) => action.status === "pending").length,
      browserRuns: browserTasks.length,
    },
    latestActivity,
  };
  res.json(GetOverviewResponse.parse(data));
});

router.get("/assistants", (_req, res): void => {
  const data = assistants.map(({ system: _system, ...assistant }) => assistant);
  res.json(ListAssistantsResponse.parse(data));
});

router.get("/activity", async (req, res): Promise<void> => {
  const parsed = ListActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = await listActivities(parsed.data.limit);
  res.json(ListActivityResponse.parse(data));
});

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = RunChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const assistant = getAssistant(parsed.data.assistantId);
  const selectedModel = parsed.data.model ?? assistant.model;
  const chain = [...new Set([selectedModel, ...assistant.fallbacks])];
  const steps = [makeStep("استلام الطلب", "completed", assistant.name)];
  let lastError = "";

  for (const model of chain) {
    steps.push(makeStep(`تشغيل ${model}`, "running"));
    try {
      const text = await runModel({
        model,
        system: assistant.system,
        message: parsed.data.message,
        history: parsed.data.history ?? [],
      });
      steps[steps.length - 1] = makeStep(`تشغيل ${model}`, "completed");
      steps.push(makeStep("عرض الرد وتسجيله", "completed"));
      const activity = await recordActivity({
        kind: "chat",
        title: `رد ${assistant.name}`,
        status: "completed",
        detail: text,
        model,
        steps,
      });
      res.json(
        RunChatResponse.parse({
          text,
          model,
          switched: model !== selectedModel,
          activityId: activity.id,
        }),
      );
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      steps[steps.length - 1] = makeStep(`تشغيل ${model}`, "failed", "النموذج غير متاح أو رفض الطلب");
      logger.warn({ err: error, model }, "Assistant model failed");
    }
  }

  steps.push(makeStep("إنهاء الطلب", "failed", "أضف مفتاح مزود مناسب أو جرّب لاحقاً"));
  await recordActivity({
    kind: "chat",
    title: `تعذر تشغيل ${assistant.name}`,
    status: "failed",
    detail: lastError,
    model: selectedModel,
    steps,
  });
  res.status(503).json({
    error: "لا يوجد مزود نموذج جاهز حالياً. أضف مفتاح OpenAI أو Gemini من إعدادات الأسرار.",
  });
});

router.get("/connections", async (_req, res): Promise<void> => {
  res.json(ListConnectionsResponse.parse(await listServiceConnections()));
});

router.get("/connection-actions", async (_req, res): Promise<void> => {
  res.json(ListConnectionActionsResponse.parse(await listConnectionActions()));
});

router.post("/connection-actions", async (req, res): Promise<void> => {
  const parsed = CreateConnectionActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const row = {
    id: crypto.randomUUID(),
    provider: parsed.data.provider,
    action: parsed.data.action,
    target: parsed.data.target,
    description: parsed.data.description,
    payload: parsed.data.payload ?? null,
    status: "pending",
    createdAt: new Date(),
    completedAt: null,
  };
  await db.insert(connectionActionsTable).values(row);
  await recordActivity({
    kind: "approval",
    title: `طلب موافقة: ${parsed.data.provider}`,
    status: "pending",
    detail: parsed.data.description,
    steps: [makeStep("إنشاء طلب تحت المراجعة", "completed")],
  });
  res.status(201).json(CreateConnectionActionResponse.parse(connectionActionResponse(row)));
});

async function resolveConnectionAction(id: string, status: "approved" | "rejected") {
  const row = await findConnectionAction(id);
  if (!row) return undefined;
  const detail =
    status === "rejected"
      ? "تم رفض الطلب من المالك."
      : "تمت الموافقة وحفظ الطلب ليكون جاهزاً للمزامنة اللاحقة؛ لم تُنفّذ كتابة خارجية الآن.";
  const [updated] = await db
    .update(connectionActionsTable)
    .set({ status, completedAt: new Date() })
    .where(eq(connectionActionsTable.id, id))
    .returning();
  if (!updated) return undefined;
  await recordActivity({
    kind: "approval",
    title: `${row.provider}: ${row.action}`,
    status,
    detail,
    steps: [
      makeStep("مراجعة الطلب", "completed"),
      makeStep(status === "approved" ? "موافقة المالك" : "رفض المالك", "completed"),
      makeStep(status === "approved" ? "تجهيز للمزامنة" : "إغلاق الطلب", "completed", detail),
    ],
  });
  return updated;
}

router.post("/connection-actions/:id/approve", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const updated = await resolveConnectionAction(id, "approved");
  if (!updated) {
    res.status(404).json({ error: "Connection action not found" });
    return;
  }
  res.json(CreateConnectionActionResponse.parse(connectionActionResponse(updated)));
});

router.post("/connection-actions/:id/reject", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const updated = await resolveConnectionAction(id, "rejected");
  if (!updated) {
    res.status(404).json({ error: "Connection action not found" });
    return;
  }
  res.json(CreateConnectionActionResponse.parse(connectionActionResponse(updated)));
});

router.get("/browser/tasks", async (_req, res): Promise<void> => {
  res.json(ListBrowserTasksResponse.parse(await listBrowserTasks()));
});

router.post("/browser/tasks", async (req, res): Promise<void> => {
  const parsed = CreateBrowserTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const command = parsed.data.command;
  const requestedUrl = parsed.data.url ?? command.match(/https?:\/\/[^\s]+/i)?.[0]?.replace(/[),.!؟]+$/, "");
  const steps = [makeStep("استلام أمر المتصفح", "completed")];
  let status = "needs_url";
  let result: string | null = null;

  if (!requestedUrl) {
    steps.push(makeStep("تحديد صفحة البداية", "waiting", "أضف رابطاً أو اكتب الرابط داخل الأمر."));
  } else {
    steps.push(makeStep("فتح صفحة البداية", "running", requestedUrl));
    try {
      const target = new URL(requestedUrl);
      if (!["http:", "https:"].includes(target.protocol)) throw new Error("Only http and https URLs are allowed");
      const response = await fetch(target, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
      const body = (await response.text()).slice(0, 100_000);
      const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
      result = `${response.status} ${response.statusText}${title ? ` — ${title}` : ""}`;
      status = response.ok ? "completed" : "failed";
      steps[steps.length - 1] = makeStep("فتح صفحة البداية", response.ok ? "completed" : "failed", result);
      steps.push(makeStep("حفظ نتيجة التصفح", "completed", `${body.length} حرفاً قُرئت للمعالجة`));
    } catch (error) {
      status = "failed";
      result = error instanceof Error ? error.message : String(error);
      steps[steps.length - 1] = makeStep("فتح صفحة البداية", "failed", result);
    }
  }

  const task = {
    id: crypto.randomUUID(),
    command,
    status,
    createdAt: new Date(),
    result,
    steps,
  };
  await db.insert(browserTasksTable).values(task);
  await recordActivity({
    kind: "browser",
    title: "تنفيذ أمر المتصفح",
    status,
    detail: result,
    steps,
  });
  res.status(201).json(CreateBrowserTaskResponse.parse({
    ...task,
    createdAt: task.createdAt.toISOString(),
  }));
});

export default router;