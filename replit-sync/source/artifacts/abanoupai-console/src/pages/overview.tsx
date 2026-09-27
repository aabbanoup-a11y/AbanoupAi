import { ArrowLeft, Bot, CheckCircle2, CircleDot, GitCommitHorizontal, GitFork, Layers3, RefreshCw, ShieldCheck, TerminalSquare } from 'lucide-react';
import { Link } from 'wouter';
import { useGetOverview } from '@workspace/api-client-react';
import { ConsoleShell, EmptyState, PageIntro, QueryState, SectionLabel, StatusPill } from '@/components/console-shell';

const formatDate = (value: string) => new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export default function OverviewPage() {
  const overview = useGetOverview();
  const data = overview.data;
  return <ConsoleShell>
    <div className="console-rise">
      <PageIntro eyebrow="المحطة المركزية / ٠١" title="صباح الخير، هذه غرفة التحكم." description="مراقبة AbanoupAi من مكان واحد: ما هو متصل، ما نُفّذ، وما ينتظر قرار المالك." action={<div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent-foreground"><span className="status-dot size-2 rounded-full bg-accent" />كل الأنظمة تحت المراقبة</div>} />
      <QueryState loading={overview.isLoading} error={overview.isError} onRetry={() => overview.refetch()}>
        {data ? <div className="space-y-7">
          <section className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
            <div className="console-grid relative overflow-hidden rounded-2xl border border-primary bg-primary p-6 text-primary-foreground sm:p-8">
              <div className="absolute -left-8 -top-8 size-44 rounded-full border border-accent/20" />
              <div className="absolute -left-2 top-4 size-28 rounded-full border border-accent/20" />
              <div className="relative">
                <div className="mb-10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent"><GitFork size={17} /><span className="font-mono text-[10px] tracking-[.14em]">IMPORTED REPOSITORY</span></div>
                  <StatusPill status="connected" />
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl"><span className="ltr inline-block">{data.repository.owner}</span><span className="px-2 text-accent">/</span><span className="ltr inline-block">{data.repository.name}</span></h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-primary-foreground/65">المستودع الذي يقرأه المساعدون ويعملون داخله — دون اتصال خفي أو صلاحيات غير مرئية.</p>
                <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-primary-foreground/15 pt-5 font-mono text-[10px] text-primary-foreground/60">
                  <span className="flex items-center gap-2"><GitCommitHorizontal size={14} className="text-accent" /><span className="ltr">{data.repository.lastCommit.slice(0, 10)}</span></span>
                  <span className="flex items-center gap-2"><CircleDot size={14} className="text-accent" /><span className="ltr">{data.repository.branch}</span></span>
                  <span className="flex items-center gap-2"><TerminalSquare size={14} className="text-accent" /><span className="ltr">{data.repository.files} files</span></span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between"><div className="grid size-11 place-items-center rounded-xl bg-accent/20 text-accent-foreground"><ShieldCheck size={21} /></div><span className="font-mono text-[10px] text-muted-foreground">SYSTEM STATUS</span></div>
              <p className="mt-8 text-sm text-muted-foreground">الجاهزية التشغيلية</p>
              <p className="mt-1 font-display text-4xl font-bold tracking-tight">مستقرة<span className="text-accent">.</span></p>
              <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[92%] rounded-full bg-accent" /></div>
              <p className="mt-2 text-[11px] text-muted-foreground">آخر فحص منذ أقل من دقيقة</p>
            </div>
          </section>

          <section>
            <SectionLabel>لقطة التشغيل</SectionLabel>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
              {[
                { label: 'المساعدون', value: data.assistants, icon: Bot, note: 'سلاسل جاهزة' },
                { label: 'الخدمات', value: data.services, icon: Layers3, note: 'اتصالات ظاهرة' },
                { label: 'إجمالي التنفيذات', value: data.totals.tasks, icon: TerminalSquare, note: `${data.totals.completed} مكتمل` },
                { label: 'تنتظر الموافقة', value: data.totals.pendingApprovals, icon: ShieldCheck, note: 'قرار المالك', accent: true },
              ].map((stat) => <div key={stat.label} className={`bg-card p-5 sm:p-6 ${stat.accent ? 'bg-accent/10' : ''}`} data-testid={`stat-${stat.label}`}>
                <div className="flex items-center justify-between"><stat.icon size={17} className={stat.accent ? 'text-accent-foreground' : 'text-muted-foreground'} /><span className="font-mono text-[10px] text-muted-foreground">LIVE</span></div>
                <p className="mt-6 font-display text-3xl font-bold">{stat.value}</p><p className="mt-1 text-xs font-semibold">{stat.label}</p><p className="mt-2 text-[10px] text-muted-foreground">{stat.note}</p>
              </div>)}
            </div>
          </section>

          <section className="grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
            <div>
              <SectionLabel count={data.latestActivity.length}>آخر النشاطات</SectionLabel>
              {data.latestActivity.length ? <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{data.latestActivity.map((item) => <div key={item.id} className="flex items-center gap-4 p-4 sm:p-5" data-testid={`activity-latest-${item.id}`}>
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary"><CheckCircle2 size={17} className="text-emerald-700" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.detail || item.kind}</p></div>
                <div className="hidden text-left sm:block"><StatusPill status={item.status} /><p className="mt-2 font-mono text-[9px] text-muted-foreground">{formatDate(item.createdAt)}</p></div>
              </div>)}</div> : <EmptyState title="لا يوجد نشاط بعد" detail="ستظهر هنا كل نتيجة بمجرد تشغيل أول أمر." />}
              <Link href="/activity" data-testid="link-view-all-activity" className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-xs font-semibold hover:bg-secondary">فتح السجل الكامل <ArrowLeft size={14} /></Link>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <SectionLabel>كيف يعمل الإشراف؟</SectionLabel>
              <div className="mt-6 space-y-5">
                {['أنت تكتب الأمر بلغة واضحة', 'المساعد يختار المسار والنموذج', 'نرى النتيجة والخطوات كاملة', 'التغييرات الحساسة تنتظر موافقتك'].map((text, index) => <div key={text} className="flex items-start gap-3"><div className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px] ${index === 3 ? 'bg-accent text-accent-foreground' : 'bg-secondary'}`}>{String(index + 1).padStart(2, '0')}</div><p className="pt-1 text-sm leading-5">{text}</p></div>)}
              </div>
              <div className="mt-7 border-t border-border pt-5"><Link href="/browser" data-testid="link-try-browser-task" className="flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground">جرّب مهمة متصفح <ArrowLeft size={14} /></Link></div>
            </div>
          </section>
        </div> : null}
      </QueryState>
    </div>
  </ConsoleShell>;
}