import { Check, ChevronDown, ExternalLink, Globe2, LoaderCircle, Play, RotateCw, ScanLine, Terminal, X } from 'lucide-react';
import { useState } from 'react';
import { useCreateBrowserTask, useListBrowserTasks, getListBrowserTasksQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ConsoleShell, EmptyState, PageIntro, QueryState, SectionLabel, StatusPill } from '@/components/console-shell';

const formatDate = (value: string) => new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export default function BrowserPage() {
  const tasks = useListBrowserTasks();
  const createTask = useCreateBrowserTask();
  const queryClient = useQueryClient();
  const [command, setCommand] = useState('');
  const [url, setUrl] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const run = () => {
    if (!command.trim() || createTask.isPending) return;
    createTask.mutate({ data: { command: command.trim(), url: url.trim() || null } }, {
      onSuccess: () => { setCommand(''); setUrl(''); queryClient.invalidateQueries({ queryKey: getListBrowserTasksQueryKey() }); },
    });
  };
  const list = tasks.data ?? [];
  return <ConsoleShell>
    <div className="console-rise">
      <PageIntro eyebrow="المتصفح / ٠٣" title="مهمة واحدة. كل خطوة مرئية." description="أعطِ أمراً بسيطاً للمتصفح. ينفّذ المسار الآمن، ويكتب لك ما حدث خطوة بخطوة — لا صندوق أسود." action={<div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold"><ScanLine size={15} /> تدقيق حي</div>} />
      <section className="relative overflow-hidden rounded-2xl border border-primary bg-primary p-5 text-primary-foreground sm:p-7">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-accent/5 [clip-path:polygon(35%_0,100%_0,65%_100%,0_100%)]" />
        <div className="relative">
          <div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">COMMAND LINE / BROWSER</p><h2 className="mt-2 font-display text-xl font-bold">ما الذي تريد أن نراه؟</h2></div><Terminal size={24} className="text-accent/70" /></div>
          <textarea value={command} onChange={(event) => setCommand(event.target.value)} placeholder="مثال: افتح صفحة المستودع وتحقق من حالة آخر commit" className="min-h-[88px] w-full resize-none rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/40 focus:border-accent" data-testid="input-browser-command" />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center gap-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 px-3"><ExternalLink size={14} className="text-accent" /><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="رابط بداية اختياري" className="w-full bg-transparent py-3 text-xs text-primary-foreground outline-none placeholder:text-primary-foreground/40 ltr" data-testid="input-browser-url" /></div><button onClick={run} disabled={!command.trim() || createTask.isPending} className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-xs font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-run-browser-task">{createTask.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />} {createTask.isPending ? 'جارٍ التنفيذ...' : 'شغّل المهمة'}</button></div>
          {createTask.isError && <p className="mt-3 flex items-center gap-2 text-xs text-red-200" data-testid="status-browser-error"><X size={13} /> لم تبدأ المهمة. راجع الأمر والرابط وحاول مجدداً.</p>}
          {createTask.isSuccess && <p className="mt-3 flex items-center gap-2 text-xs text-accent" data-testid="status-browser-success"><Check size={13} /> أُضيفت المهمة إلى خط التنفيذ.</p>}
        </div>
      </section>
      <section className="mt-8">
        <SectionLabel count={list.length}>مسارات التنفيذ</SectionLabel>
        <QueryState loading={tasks.isLoading} error={tasks.isError} onRetry={() => tasks.refetch()}>
          {list.length ? <div className="space-y-3">{list.map((task) => { const isExpanded = expanded === task.id; return <div key={task.id} className="overflow-hidden rounded-2xl border border-border bg-card" data-testid={`browser-task-${task.id}`}>
            <button onClick={() => setExpanded(isExpanded ? null : task.id)} className="flex w-full items-center gap-4 p-4 text-right sm:p-5" data-testid={`button-expand-browser-${task.id}`}><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground"><Globe2 size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{task.command}</p><StatusPill status={task.status} /></div><p className="mt-1 font-mono text-[10px] text-muted-foreground">{formatDate(task.createdAt)} <span className="px-2">/</span><span className="ltr">{task.id.slice(0, 12)}</span></p></div><ChevronDown size={17} className={`shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>
            {isExpanded && <div className="border-t border-border bg-secondary/30 px-5 py-5 sm:px-16"><div className="mb-4 flex items-center justify-between"><p className="text-xs font-bold">سجل الخطوات</p><RotateCw size={14} className="text-muted-foreground" /></div><div className="relative space-y-4 before:absolute before:right-[9px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">{task.steps?.map((step, index) => <div key={`${task.id}-${index}`} className="relative flex gap-3"><div className={`z-10 grid size-5 shrink-0 place-items-center rounded-full border-2 ${step.status.toLowerCase().includes('fail') ? 'border-destructive bg-background text-destructive' : 'border-accent bg-accent text-accent-foreground'}`}>{step.status.toLowerCase().includes('fail') ? <X size={10} /> : <Check size={10} strokeWidth={3} />}</div><div className="flex-1 pb-1"><p className="text-xs font-semibold">{step.label}</p>{step.detail && <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{step.detail}</p>}<p className="mt-1 font-mono text-[9px] text-muted-foreground">{formatDate(step.at)}</p></div></div>)}</div>{task.result && <div className="mt-5 rounded-xl border border-border bg-card p-4 text-xs leading-6"><p className="mb-1 font-mono text-[9px] text-muted-foreground">RESULT</p>{task.result}</div>}</div>}
          </div>; })}</div> : <EmptyState title="لا توجد مهام متصفح" detail="اكتب أمراً في الأعلى لتبدأ أول مسار قابل للتدقيق." />}
        </QueryState>
      </section>
    </div>
  </ConsoleShell>;
}