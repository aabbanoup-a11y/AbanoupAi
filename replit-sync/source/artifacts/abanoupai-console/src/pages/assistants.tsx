import { Bot, ChevronDown, Clock3, CornerDownLeft, Cpu, MessageSquareText, Send, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useListAssistants, useRunChat } from '@workspace/api-client-react';
import { ConsoleShell, EmptyState, PageIntro, QueryState, SectionLabel, StatusPill } from '@/components/console-shell';
import type { Assistant, ChatMessage } from '@workspace/api-client-react';

const formatDate = (value: string) => new Intl.DateTimeFormat('ar', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(value));
type Message = { role: 'user' | 'assistant'; content: string; model?: string; switched?: boolean; activityId?: string; at: string };

export default function AssistantsPage() {
  const assistants = useListAssistants();
  const chat = useRunChat();
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<Record<string, Message[]>>({});
  const list = assistants.data ?? [];
  const selected = useMemo<Assistant | undefined>(() => list.find((item) => item.id === (selectedId || list[0]?.id)), [list, selectedId]);
  const current = selected ? history[selected.id] ?? [] : [];

  const send = () => {
    if (!selected || !message.trim() || chat.isPending) return;
    const text = message.trim();
    const userMessage: Message = { role: 'user', content: text, at: new Date().toISOString() };
    setHistory((items) => ({ ...items, [selected.id]: [...(items[selected.id] ?? []), userMessage] }));
    setMessage('');
    const apiHistory: ChatMessage[] = [...current, userMessage].map((item) => ({ role: item.role, content: item.content }));
    chat.mutate({ data: { assistantId: selected.id, message: text, model: selected.model, history: apiHistory } }, {
      onSuccess: (response) => setHistory((items) => ({ ...items, [selected.id]: [...(items[selected.id] ?? []), { role: 'assistant', content: response.text, model: response.model, switched: response.switched, activityId: response.activityId, at: new Date().toISOString() }] })),
    });
  };

  return <ConsoleShell>
    <div className="console-rise">
      <PageIntro eyebrow="المساعدون / ٠٢" title="قل ما تريد. راقب كيف يحدث." description="محادثة مباشرة مع السلاسل المهيأة للمستودع. النموذج الأساسي والبديل ظاهران دائماً، ولا توجد إجابة بلا أثر في السجل." action={<div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs"><Sparkles size={15} className="text-accent-foreground" /> لا توجد أرصدة Lovable هنا</div>} />
      <QueryState loading={assistants.isLoading} error={assistants.isError} onRetry={() => assistants.refetch()}>
        {list.length ? <div className="grid gap-5 lg:grid-cols-[290px_1fr]">
          <div className="space-y-2">
            <SectionLabel count={list.length}>السلاسل المتاحة</SectionLabel>
            {list.map((assistant) => <button key={assistant.id} onClick={() => setSelectedId(assistant.id)} className={`w-full rounded-2xl border p-4 text-right transition-colors ${selected?.id === assistant.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-secondary'}`} data-testid={`button-assistant-${assistant.id}`}>
              <div className="flex items-start gap-3"><div className={`grid size-9 shrink-0 place-items-center rounded-xl ${selected?.id === assistant.id ? 'bg-accent text-accent-foreground' : 'bg-accent/20 text-accent-foreground'}`}><Bot size={18} /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{assistant.name}</p><p className={`mt-1 text-[11px] ${selected?.id === assistant.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{assistant.role}</p></div></div>
              <p className={`mt-4 line-clamp-2 text-[11px] leading-5 ${selected?.id === assistant.id ? 'text-primary-foreground/65' : 'text-muted-foreground'}`}>{assistant.description}</p>
              <div className={`mt-4 flex items-center gap-2 border-t pt-3 font-mono text-[9px] ${selected?.id === assistant.id ? 'border-primary-foreground/15 text-primary-foreground/60' : 'border-border text-muted-foreground'}`}><Cpu size={12} /><span className="ltr">{assistant.model}</span></div>
            </button>)}
          </div>
          {selected && <div className="flex min-h-[610px] flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-accent"><Bot size={20} /></div><div><p className="text-sm font-bold">{selected.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{selected.role}</p></div></div><div className="text-left"><StatusPill status="active" /><p className="mt-2 font-mono text-[9px] text-muted-foreground ltr">{selected.model}</p></div></div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5 console-scroll sm:p-7" data-testid="conversation-thread">
              {!current.length && <div className="grid h-full min-h-[350px] place-items-center text-center"><div><div className="mx-auto grid size-14 place-items-center rounded-2xl border border-dashed border-border text-muted-foreground"><MessageSquareText size={25} /></div><p className="mt-5 font-semibold">ابدأ من هنا</p><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">اكتب طلباً عن المستودع أو اطلب من المساعد فحص فكرة محددة.</p></div></div>}
              {current.map((item, index) => <div key={`${item.at}-${index}`} className={`flex gap-3 ${item.role === 'user' ? 'flex-row-reverse' : ''}`} data-testid={`message-${item.role}-${index}`}><div className={`grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${item.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-primary text-accent'}`}>{item.role === 'user' ? 'أنت' : <Bot size={15} />}</div><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-7 ${item.role === 'user' ? 'rounded-tr-sm bg-accent/25' : 'rounded-tl-sm bg-secondary'}`}><p className="whitespace-pre-wrap">{item.content}</p>{item.role === 'assistant' && <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/70 pt-2 font-mono text-[9px] text-muted-foreground"><span className="ltr">{item.model}</span>{item.switched && <span className="text-orange-700">fallback activated</span>}{item.activityId && <span className="ltr">audit:{item.activityId.slice(0, 8)}</span>}</div>}<p className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground"><Clock3 size={10} />{formatDate(item.at)}</p></div></div>)}
              {chat.isPending && <div className="flex gap-3"><div className="grid size-8 place-items-center rounded-lg bg-primary text-accent"><Bot size={15} /></div><div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3"><div className="flex gap-1"><span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" /><span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:.15s]" /><span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:.3s]" /></div></div></div>}
              {chat.isError && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive" data-testid="status-chat-error">تعذر تشغيل الطلب. لم يتم تسجيل إجابة ناقصة، جرّب مرة أخرى.</div>}
            </div>
            <div className="border-t border-border p-4 sm:p-5"><div className="mb-3 flex items-center justify-between text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><CornerDownLeft size={12} /> Enter للإرسال</span><span className="font-mono ltr">{selected.fallbacks.length} fallbacks configured</span></div><div className="flex gap-2"><textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="اكتب أمراً واضحاً للمساعد..." className="min-h-[50px] flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="input-chat-command" /><button onClick={send} disabled={!message.trim() || chat.isPending} className="self-end rounded-xl bg-primary p-3 text-accent disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-send-chat" aria-label="إرسال الأمر"><Send size={18} /></button></div></div>
          </div>}
        </div> : <EmptyState title="لا يوجد مساعدون مهيؤون" detail="ستظهر المساعدات المتصلة بالمستودع هنا." />}
      </QueryState>
    </div>
  </ConsoleShell>;
}