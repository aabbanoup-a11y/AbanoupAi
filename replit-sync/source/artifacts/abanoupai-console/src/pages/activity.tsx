import { Activity, Check, ChevronDown, CircleAlert, Clock3, Cpu, Filter, ListChecks, RotateCw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useListActivity } from '@workspace/api-client-react';
import { ConsoleShell, EmptyState, PageIntro, QueryState, SectionLabel, StatusPill } from '@/components/console-shell';

const formatDate = (value: string) => new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export default function ActivityPage() {
  const activity = useListActivity({ limit: 200 });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const list = activity.data ?? [];
  const filtered = useMemo(() => filter === 'all' ? list : list.filter((item) => item.status.toLowerCase().includes(filter)), [filter, list]);

  return <ConsoleShell>
    <div className="console-rise">
      <PageIntro eyebrow="السجل الكامل / ٠٥" title="كل شيء له أثر." description="سجل زمني واحد لكل محادثة ومهمة متصفح وتنفيذ. افتح أي سجل لترى المسار، النموذج، ونتيجة كل خطوة." action={<div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs"><Activity size={15} className="text-accent-foreground" /><span className="font-mono ltr">200 max records</span></div>} />
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <SectionLabel count={`${filtered.length} / ${list.length}`}>سجل التنفيذ</SectionLabel>
        <div className="flex items-center gap-2"><Filter size={14} className="text-muted-foreground" /><div className="flex rounded-lg border border-border bg-card p-1">
          {[
            ['all', 'الكل'],
            ['completed', 'مكتمل'],
            ['pending', 'معلّق'],
          ].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold ${filter === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`} data-testid={`button-filter-${value}`}>{label}</button>)}
        </div></div>
      </div>
      <QueryState loading={activity.isLoading} error={activity.isError} onRetry={() => activity.refetch()}>
        {filtered.length ? <div className="space-y-2">
          {filtered.map((record) => {
            const isExpanded = expanded === record.id;
            const failed = record.status.toLowerCase().includes('fail') || record.status.toLowerCase().includes('error');
            return <div key={record.id} className="overflow-hidden rounded-2xl border border-border bg-card" data-testid={`activity-record-${record.id}`}>
              <button onClick={() => setExpanded(isExpanded ? null : record.id)} className="flex w-full items-center gap-4 p-4 text-right sm:p-5" data-testid={`button-expand-activity-${record.id}`}>
                <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${failed ? 'bg-destructive/10 text-destructive' : 'bg-accent/20 text-accent-foreground'}`}>{failed ? <CircleAlert size={18} /> : <ListChecks size={18} />}</div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{record.title}</p><StatusPill status={record.status} /></div><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground"><span>{record.kind}</span><span className="font-mono ltr">{record.id.slice(0, 12)}</span><span className="flex items-center gap-1"><Clock3 size={11} />{formatDate(record.createdAt)}</span></div></div>
                <ChevronDown size={17} className={`shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && <div className="border-t border-border bg-secondary/25 px-5 py-5 sm:px-16">
                <div className="grid gap-5 md:grid-cols-[1fr_220px]">
                  <div><p className="mb-4 text-xs font-bold">تسلسل التنفيذ</p>
                    <div className="relative space-y-4 before:absolute before:right-[9px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                      {record.steps?.length ? record.steps.map((step, index) => {
                        const stepFailed = step.status.toLowerCase().includes('fail');
                        return <div key={`${record.id}-${index}`} className="relative flex gap-3"><div className={`z-10 grid size-5 shrink-0 place-items-center rounded-full border-2 ${stepFailed ? 'border-destructive bg-background text-destructive' : 'border-accent bg-accent text-accent-foreground'}`}>{stepFailed ? <X size={10} /> : <Check size={10} strokeWidth={3} />}</div><div className="flex-1"><p className="text-xs font-semibold">{step.label}</p>{step.detail && <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{step.detail}</p>}<p className="mt-1 font-mono text-[9px] text-muted-foreground">{formatDate(step.at)}</p></div></div>;
                      }) : <p className="text-xs text-muted-foreground">لا توجد خطوات مسجلة لهذا التنفيذ.</p>}
                    </div>
                    {record.detail && <div className="mt-5 rounded-xl border border-border bg-card p-4 text-xs leading-6">{record.detail}</div>}
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4"><p className="font-mono text-[9px] text-muted-foreground">MODEL ROUTE</p><p className="mt-2 flex items-center gap-2 text-xs font-semibold"><Cpu size={14} />{record.model || 'غير محدد'}</p><div className="my-4 border-t border-border" /><p className="font-mono text-[9px] text-muted-foreground">AUDIT ID</p><p className="mt-2 break-all font-mono text-[10px] text-muted-foreground ltr">{record.id}</p></div>
                </div>
              </div>}
            </div>;
          })}
        </div> : <EmptyState title="لا توجد سجلات مطابقة" detail={filter === 'all' ? 'ستظهر هنا كل العمليات بمجرد تشغيل أمر.' : 'جرّب تصفية أخرى لرؤية سجلات أكثر.'} />}
      </QueryState>
      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground"><RotateCw size={12} /> البيانات محدثة من سجل التنفيذ المركزي</div>
    </div>
  </ConsoleShell>;
}