import { Activity, Bot, Cable, ChevronLeft, Command, GitBranch, Globe2, LayoutDashboard, Menu, ShieldCheck, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

const navItems = [
  { href: '/', label: 'نظرة عامة', hint: 'المشهد الكامل', icon: LayoutDashboard },
  { href: '/assistants', label: 'المساعدون', hint: 'محادثات مباشرة', icon: Bot },
  { href: '/browser', label: 'المتصفح', hint: 'مهام قابلة للتدقيق', icon: Globe2 },
  { href: '/connections', label: 'الاتصالات', hint: 'تحت إشراف المالك', icon: Cable },
  { href: '/activity', label: 'السجل الكامل', hint: 'كل التنفيذات', icon: Activity },
];

export function ConsoleShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const active = navItems.find((item) => item.href === location)?.href ?? '/';

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 right-0 z-40 flex w-[278px] flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-6">
          <Link href="/" data-testid="link-brand" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[4px_4px_0_hsl(208_28%_28%)]">
              <Command size={20} strokeWidth={2.6} />
            </div>
            <div>
              <p className="font-display text-base font-bold tracking-tight">Abanoup<span className="text-sidebar-primary">Ai</span></p>
              <p className="font-mono text-[9px] uppercase tracking-[.22em] text-sidebar-foreground/55">control console</p>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent lg:hidden" data-testid="button-close-navigation" aria-label="إغلاق القائمة"><X size={18} /></button>
        </div>

        <div className="px-5 pt-7">
          <div className="mb-3 flex items-center gap-2 px-3 text-[10px] font-semibold tracking-[.14em] text-sidebar-foreground/45">
            <GitBranch size={13} />
            <span className="ltr">aabbanoup-a11y</span>
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.href;
              return (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setOpen(false)}
                  data-testid={`link-nav-${item.href === '/' ? 'overview' : item.href.slice(1)}`}
                  className={`group flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${isActive ? 'border-sidebar-primary/30 bg-sidebar-primary text-sidebar-primary-foreground' : 'border-transparent text-sidebar-foreground/72 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`mt-0.5 block text-[10px] ${isActive ? 'text-sidebar-primary-foreground/65' : 'text-sidebar-foreground/40'}`}>{item.hint}</span>
                  </span>
                  {isActive && <ChevronLeft size={15} />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-5">
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="status-dot size-2 rounded-full bg-sidebar-primary" />
              <span className="text-xs font-semibold">وضع الإشراف نشط</span>
            </div>
            <p className="text-[11px] leading-5 text-sidebar-foreground/55">التغييرات الخارجية لا تُنفذ دون موافقة المالك.</p>
            <div className="mt-4 flex items-center justify-between border-t border-sidebar-border pt-3 font-mono text-[10px] text-sidebar-foreground/45">
              <span>API / healthy</span>
              <ShieldCheck size={14} className="text-sidebar-primary" />
            </div>
          </div>
        </div>
      </aside>

      {open && <button className="fixed inset-0 z-30 bg-sidebar/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} data-testid="button-navigation-overlay" aria-label="إغلاق القائمة" />}

      <main className="min-h-[100dvh] lg:mr-[278px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="rounded-xl border border-border bg-card p-2.5 lg:hidden" data-testid="button-open-navigation" aria-label="فتح القائمة"><Menu size={18} /></button>
            <div className="hidden size-2 rounded-full bg-accent sm:block" />
            <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">SUPERVISED / LIVE</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:block">مالك النظام</span>
            <div className="grid size-9 place-items-center rounded-full border border-border bg-secondary font-display font-bold text-foreground" data-testid="text-owner-initials">م</div>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] p-5 sm:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[.22em] text-muted-foreground">{eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" data-testid="text-page-title">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SectionLabel({ children, count }: { children: ReactNode; count?: string | number }) {
  return <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-sm font-bold">{children}</h2>{count !== undefined && <span className="font-mono text-[10px] text-muted-foreground">{count}</span>}</div>;
}

export function QueryState({ loading, error, onRetry, children }: { loading?: boolean; error?: boolean; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <div className="space-y-3" data-testid="state-loading">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>;
  if (error) return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center" data-testid="state-error"><p className="font-semibold">تعذر تحميل البيانات</p><p className="mt-1 text-sm text-muted-foreground">تحقق من اتصال واجهة البرمجة ثم حاول مرة أخرى.</p><button onClick={onRetry} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground" data-testid="button-retry">إعادة المحاولة</button></div>;
  return <>{children}</>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center" data-testid="state-empty"><p className="font-semibold">{title}</p><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div>;
}

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const isGood = ['completed', 'success', 'connected', 'approved', 'done', 'active'].some((word) => normalized.includes(word));
  const isBad = ['failed', 'error', 'rejected', 'offline'].some((word) => normalized.includes(word));
  const label = isGood ? 'مكتمل' : isBad ? 'فشل' : normalized.includes('pending') ? 'قيد المراجعة' : status;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${isGood ? 'border-emerald-600/20 bg-emerald-500/10 text-emerald-700' : isBad ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-orange-600/20 bg-orange-500/10 text-orange-700'}`} data-testid={`status-${status}`}><span className="size-1.5 rounded-full bg-current" />{label}</span>;
}