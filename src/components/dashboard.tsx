'use client';
import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Wallet as WalletIcon,
  Settings,
  Plus,
  Check,
  ChevronRight,
  ChevronLeft,
  Droplets,
  Dumbbell,
  BookOpen,
  Flower2,
  Clock3,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  LockKeyhole,
  Download,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Moon,
  Monitor,
  Smile,
  ArrowRight,
} from 'lucide-react';
import {
  applyCommand,
  balance,
  dayProgress,
  finance,
  localDate,
  ruleFor,
  valueFor,
  modules,
  type State,
  type Entry,
  type Habit,
  type Module,
  type Command,
} from '@/modules/tracking/domain';
import { copy, moduleCopy } from '@/lib/i18n';
import { money } from '@/lib/format-money';
import { previewState } from '@/lib/preview';
import Modal from './ui/modal';
import ProductNavigation, { type ProductPage } from './product-navigation';
import s from './dashboard.module.css';

type Page = Extract<ProductPage, 'today' | 'history' | 'finance' | 'settings'>;
type Panel =
  | { kind: 'capture'; habit?: Habit; entry?: Entry; module?: Module }
  | { kind: 'habit'; habit?: Habit }
  | { kind: 'wallet' }
  | { kind: 'delete'; entry: Entry }
  | null;
const icons = {
  custom: Flower2,
  exercise: Dumbbell,
  water: Droplets,
  study: BookOpen,
  fasting: Clock3,
  finance: WalletIcon,
  reflection: Smile,
};
function shiftDate(d: string, n: number) {
  const date = new Date(`${d}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}
function Icon({ module, size = 20 }: { module: Module; size?: number }) {
  const Component = icons[module];
  return <Component size={size} aria-hidden />;
}
export default function Dashboard({
  initial,
  preview = false,
  socialAvailable = false,
  initialPage = 'today',
}: {
  initial: State;
  preview?: boolean;
  socialAvailable?: boolean;
  initialPage?: Page;
}) {
  const [state, setState] = useState(initial);
  const [page, setPage] = useState<Page>(initialPage);
  const [selected, setSelected] = useState(localDate(new Date(), initial.preferences.timezone));
  const [panel, setPanel] = useState<Panel>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [note, setNote] = useState('');
  const [mood, setMood] = useState('');
  const [prefs, setPrefs] = useState(state.preferences);
  const commandKey = useRef<{ payload: string; id: string } | null>(null);
  const lock = useRef(false);
  const lang = state.preferences.language;
  const t = copy[lang];
  const mt = moduleCopy[lang];
  const today = localDate(new Date(), state.preferences.timezone);
  const dateLabel = (
    d: string,
    options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ) =>
    new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
      ...options,
      timeZone: 'UTC',
    }).format(new Date(`${d}T12:00:00Z`));
  useEffect(() => {
    document.documentElement.dataset.theme = state.preferences.theme;
    document.documentElement.lang = lang;
  }, [state.preferences.theme, lang]);
  async function save(c: Command): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true;
    setPending(true);
    setError('');
    setMessage('');
    const payload = JSON.stringify(c);
    if (commandKey.current?.payload !== payload)
      commandKey.current = { payload, id: crypto.randomUUID() };
    try {
      if (preview) {
        const updated = applyCommand(state, c, commandKey.current.id);
        await new Promise((resolve) => setTimeout(resolve, 150));
        setState(updated);
      } else {
        const response = await fetch('/api/commands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': commandKey.current.id },
          body: payload,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Unable to save');
        setState(result.state);
      }
      setMessage(preview ? t.previewSaved : t.saved);
      commandKey.current = null;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save');
      return false;
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function quickEntry(module: Module, amount: number, habit: Habit | null = null): Command {
    const now = new Date();
    return {
      action: 'entry.create',
      entry: {
        module,
        amount,
        habitId: module === 'water' ? null : (habit?.id ?? null),
        name: habit?.name ?? mt[module],
        date: selected,
        occurredAt: now.toISOString(),
        timezone: state.preferences.timezone,
        type: 'log',
        walletId: null,
        destinationId: null,
        category: '',
        method: '',
        note: '',
      },
    };
  }
  function navigate(p: Page) {
    setPage(p);
    setError('');
    setMessage('');
    setFilter('all');
    setPeriod('day');
    setPrefs(state.preferences);
    requestAnimationFrame(() => {
      document.getElementById('main')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }
  const p = dayProgress(state, selected);
  const water = state.entries
    .filter((e) => !e.deleted && e.date === selected && e.module === 'water')
    .reduce((sum, e) => sum + e.amount, 0);
  const waterHabit = p.habits.find((h) => h.module === 'water');
  const waterTarget = waterHabit ? ruleFor(waterHabit, selected)?.target : null;
  const dow = new Date(`${selected}T12:00:00Z`).getUTCDay();
  const monday = shiftDate(selected, -((dow + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
  const from =
    period === 'week' ? monday : period === 'month' ? selected.slice(0, 7) + '-01' : selected;
  const to =
    period === 'week'
      ? shiftDate(monday, 6)
      : period === 'month'
        ? new Date(Date.UTC(Number(selected.slice(0, 4)), Number(selected.slice(5, 7)), 0, 12))
            .toISOString()
            .slice(0, 10)
        : selected;
  const totals = finance(state, from, to);
  const dayTotals = finance(state, selected);
  const entries = state.entries
    .filter(
      (e) =>
        !e.deleted &&
        e.date >= from &&
        e.date <= to &&
        (page !== 'finance' || e.type !== 'log') &&
        (filter === 'all' || e.module === filter || e.type === filter),
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = preview ? 'habittracker-preview.json' : 'habittracker-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className={s.shell}>
      <a className={s.skip} href="#main">
        {lang === 'id' ? 'Lewati navigasi' : 'Skip navigation'}
      </a>
      <ProductNavigation
        active={page}
        language={lang}
        name={state.preferences.name}
        preview={preview}
        socialAvailable={socialAvailable}
        onNavigate={navigate}
      />
      <div className={s.workspace}>
        {preview ? (
          <div className={s.previewBar} role="region" aria-label={t.preview}>
            <span>{t.preview}</span>
            <button
              aria-label={t.reset}
              onClick={() => {
                setState(previewState());
                setSelected(today);
                setError('');
                setMessage('');
              }}
            >
              <RotateCcw size={13} />
              <span>{t.reset}</span>
            </button>
          </div>
        ) : null}
        <main id="main" className={s.main} tabIndex={-1}>
          <header className={s.header}>
            <div>
              <div className={s.breadcrumb}>{dateLabel(selected)}</div>
              <h1>
                {page === 'today' ? `${t.hello}, ${state.preferences.name}` : t[page]}
                {page === 'today' ? <span className={s.greetingDot} /> : null}
              </h1>
              <p>
                {page === 'today'
                  ? t.sub
                  : page === 'history'
                    ? lang === 'id'
                      ? 'Semua langkahmu, dalam satu cerita.'
                      : 'Every step, in one story.'
                    : page === 'finance'
                      ? lang === 'id'
                        ? 'Lebih jelas melihat uangmu bergerak.'
                        : 'A clearer view of your money.'
                      : lang === 'id'
                        ? 'Atur ruang ini sesuai ritmemu.'
                        : 'Make this space your own.'}
              </p>
            </div>
            <div className={s.headerRight}>
              <span className={s.private}>
                <LockKeyhole size={13} />
                {t.private}
              </span>
              <button
                className={s.iconButton}
                aria-label={t.settings}
                onClick={() => navigate('settings')}
              >
                <Settings size={19} />
              </button>
            </div>
          </header>
          {pending ? (
            <div className={s.feedback} role="status">
              {t.saving}
            </div>
          ) : null}
          {message || error ? (
            <div className={error ? s.error : s.feedback} role={error ? 'alert' : 'status'}>
              {error || message}
              {error ? (
                <button onClick={() => setError('')} aria-label={t.close}>
                  ×
                </button>
              ) : null}
            </div>
          ) : null}
          {page !== 'settings' ? (
            <>
              <div className={s.dateHeading}>
                <h2>{dateLabel(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <div className={s.dateControls}>
                  <button
                    aria-label={lang === 'id' ? 'Minggu sebelumnya' : 'Previous week'}
                    onClick={() => setSelected(shiftDate(selected, -7))}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span>{dateLabel(selected, { month: 'long', year: 'numeric' })}</span>
                  <button
                    aria-label={lang === 'id' ? 'Minggu berikutnya' : 'Next week'}
                    onClick={() => setSelected(shiftDate(selected, 7))}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className={s.week}>
                {week.map((d) => {
                  const dp = dayProgress(state, d);
                  return (
                    <button
                      key={d}
                      aria-label={dateLabel(d)}
                      aria-pressed={d === selected}
                      aria-current={d === today ? 'date' : undefined}
                      className={`${s.day} ${d === selected ? s.daySelected : ''}`}
                      onClick={() => setSelected(d)}
                    >
                      <span>{dateLabel(d, { weekday: 'short' })}</span>
                      <strong>{Number(d.slice(8))}</strong>
                      <div className={s.dayDots}>
                        {Array.from({ length: Math.min(dp.total, 5) }, (_, i) => (
                          <i key={i} className={i < dp.completed ? s.filledDot : ''} />
                        ))}
                      </div>
                      {d === today ? <span className={s.todayMark} /> : null}
                    </button>
                  );
                })}
              </div>
              {selected !== today ? (
                <button className={s.textButton} onClick={() => setSelected(today)}>
                  {t.backToday}
                </button>
              ) : null}
            </>
          ) : null}
          {page === 'today' ? (
            <div className={s.dashboardGrid}>
              <div className={s.primaryColumn}>
                <button className={s.textButton} type="button" onClick={() => navigate('history')}>
                  {lang === 'id' ? 'Riwayat semua aktivitas →' : 'All activity history →'}
                </button>
                <section className={s.habitPanel}>
                  <div className={s.sectionHead}>
                    <div>
                      <h2>{t.habits}</h2>
                      <p>
                        {p.total ? `${p.completed} ${t.of} ${p.total} ${t.done}` : t.noSchedule}
                      </p>
                    </div>
                    <button
                      className={s.iconButton}
                      aria-label={t.newHabit}
                      onClick={() => setPanel({ kind: 'habit' })}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <button
                    className={s.primaryButton}
                    disabled={pending || selected > today}
                    onClick={() => setPanel({ kind: 'capture' })}
                  >
                    <Plus size={18} />
                    {t.record}
                  </button>
                  {p.total ? (
                    <div className={s.progressLine}>
                      <div className={s.track}>
                        <span style={{ width: `${p.percent}%` }} />
                      </div>
                      <strong>{p.percent}%</strong>
                    </div>
                  ) : null}
                  {!p.total ? <p className={s.agendaEmpty}>{t.noSchedule}</p> : null}
                  <div className={s.habitList}>
                    {p.habits.map((h) => {
                      const value = valueFor(state, h, selected);
                      const target = ruleFor(h, selected)?.target ?? 1;
                      const done = value >= target;
                      return (
                        <div key={h.id} className={s.habitRow}>
                          <span data-module={h.module} className={s.moduleIcon}>
                            <Icon module={h.module} />
                          </span>
                          <button
                            className={s.habitInfo}
                            onClick={() =>
                              setPanel({ kind: 'capture', habit: h, module: h.module })
                            }
                          >
                            <strong>{h.name}</strong>
                            <small>
                              {h.kind === 'checklist'
                                ? done
                                  ? t.complete
                                  : t.pending
                                : `${value.toLocaleString(lang)} / ${target.toLocaleString(lang)} ${h.unit}`}
                            </small>
                          </button>
                          {h.kind === 'checklist' ? (
                            <button
                              disabled={pending || selected > today}
                              className={`${s.checkButton} ${done ? s.checked : ''}`}
                              aria-label={`${h.name}: ${done ? t.complete : t.save}`}
                              aria-pressed={done}
                              onClick={() => {
                                const source = state.entries.find(
                                  (e) => !e.deleted && e.habitId === h.id && e.date === selected,
                                );
                                if (done && source)
                                  void save({
                                    action: 'entry.delete',
                                    id: source.id,
                                    version: source.version,
                                  });
                                else void save(quickEntry(h.module, 1, h));
                              }}
                            >
                              {done ? <Check size={18} /> : null}
                            </button>
                          ) : (
                            <button
                              disabled={pending || selected > today}
                              className={done ? s.doneBadge : s.addButton}
                              aria-label={`${t.record}: ${h.name}`}
                              onClick={() =>
                                setPanel({ kind: 'capture', habit: h, module: h.module })
                              }
                            >
                              {done ? <Check size={18} /> : <Plus size={18} />}
                            </button>
                          )}
                          <button
                            className={s.detailsButton}
                            aria-label={`${t.edit}: ${h.name}`}
                            onClick={() => setPanel({ kind: 'habit', habit: h })}
                          >
                            <ChevronRight size={17} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className={s.quickSection}>
                  <div className={s.sectionHead}>
                    <h2>{lang === 'id' ? 'Catat dengan cepat' : 'Quick capture'}</h2>
                    <span>{lang === 'id' ? 'Sesuai kebutuhanmu' : 'At your own pace'}</span>
                  </div>
                  <div className={s.quickGrid}>
                    {state.preferences.enabled
                      .filter((m) => m !== 'reflection' && m !== 'finance')
                      .map((m) => (
                        <button
                          key={m}
                          disabled={selected > today}
                          onClick={() => setPanel({ kind: 'capture', module: m })}
                        >
                          <span className={s.moduleIcon} data-module={m}>
                            <Icon module={m} />
                          </span>
                          <span>{mt[m]}</span>
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                  </div>
                </section>
                <section className={s.reflection}>
                  <div className={s.sectionHead}>
                    <div>
                      <h2>{t.reflection}</h2>
                      <p>{t.reflectionSub}</p>
                    </div>
                    <Flower2 className={s.reflectionIcon} size={25} />
                  </div>
                  <div className={s.moods}>
                    {(lang === 'id'
                      ? ['Berat', 'Biasa', 'Baik', 'Sangat baik']
                      : ['Tough', 'Okay', 'Good', 'Great']
                    ).map((v) => (
                      <button
                        key={v}
                        aria-pressed={mood === v}
                        className={mood === v ? s.selectedPill : ''}
                        onClick={() => setMood(v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <label className={s.srOnly} htmlFor="reflection-note">
                    {t.note}
                  </label>
                  <textarea
                    id="reflection-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={2000}
                    placeholder={
                      lang === 'id'
                        ? 'Apa yang ingin kamu ingat hari ini?'
                        : 'What would you like to remember today?'
                    }
                    rows={2}
                  />
                  <div className={s.reflectionFooter}>
                    <small>
                      <LockKeyhole size={12} />
                      {t.private}
                    </small>
                    <button
                      className={s.textButton}
                      disabled={
                        pending ||
                        !note.trim() ||
                        selected > today ||
                        !state.preferences.enabled.includes('reflection')
                      }
                      onClick={async () => {
                        const c = quickEntry('reflection', 1);
                        if (c.action === 'entry.create') {
                          c.entry.note = note;
                          c.entry.name = mood || mt.reflection;
                        }
                        const existing = state.entries.find(
                          (e) => !e.deleted && e.module === 'reflection' && e.date === selected,
                        );
                        const operation: Command =
                          existing && c.action === 'entry.create'
                            ? {
                                action: 'entry.edit',
                                id: existing.id,
                                version: existing.version,
                                entry: c.entry,
                              }
                            : c;
                        if (await save(operation)) {
                          setNote('');
                          setMood('');
                        }
                      }}
                    >
                      {t.save}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
              </div>
              <aside className={s.summaryColumn} aria-label={`${t.water}, ${t.finance}`}>
                {state.preferences.enabled.includes('water') ? (
                  <section className={s.waterPanel}>
                    <div className={s.sectionHead}>
                      <h2>{t.water}</h2>
                      <Droplets size={20} />
                    </div>
                    <div className={s.waterContent}>
                      <div>
                        <strong>
                          {water.toLocaleString(lang)} <span className={s.waterUnit}>ml</span>
                        </strong>
                        <p>
                          {waterTarget
                            ? `${t.target}: ${waterTarget.toLocaleString(lang)} ml`
                            : lang === 'id'
                              ? 'Belum ada target'
                              : 'No target set'}
                        </p>
                        <small>
                          {waterTarget
                            ? t.target
                            : lang === 'id'
                              ? 'Total tercatat'
                              : 'Recorded total'}
                        </small>
                      </div>
                    </div>
                    <button
                      className={s.waterButton}
                      disabled={pending || selected > today}
                      onClick={() => void save(quickEntry('water', 250))}
                    >
                      <Plus size={17} />
                      {t.addWater}
                    </button>
                    <button
                      className={s.textButton}
                      onClick={() => setPanel({ kind: 'capture', module: 'water' })}
                    >
                      {t.other}
                      <ArrowRight size={14} />
                    </button>
                  </section>
                ) : null}
                {state.preferences.enabled.includes('finance') ? (
                  <section className={s.financePanel}>
                    <div className={s.sectionHead}>
                      <h2>{t.finance}</h2>
                      <button
                        className={s.iconButton}
                        aria-label={t.finance}
                        onClick={() => navigate('finance')}
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                    <small>
                      {t.expense} · {dateLabel(selected, { day: 'numeric', month: 'short' })}
                    </small>
                    <strong className={s.bigMoney}>{money(dayTotals.expense, lang)}</strong>
                    {dayTotals.count ? (
                      <div className={s.miniFinance}>
                        <span>{t.income}</span>
                        <strong>{money(dayTotals.income, lang)}</strong>
                      </div>
                    ) : (
                      <p className={s.noTransactions}>{t.noTransactions}</p>
                    )}
                    <button
                      className={s.secondaryButton}
                      disabled={selected > today}
                      onClick={() => setPanel({ kind: 'capture', module: 'finance' })}
                    >
                      <Plus size={17} />
                      {t.addTransaction}
                    </button>
                  </section>
                ) : null}
              </aside>
            </div>
          ) : null}
          {page === 'history' || page === 'finance' ? (
            <>
              <div className={s.toolbar}>
                <div className={s.periods}>
                  {(['day', 'week', 'month'] as const).map((v) => (
                    <button
                      key={v}
                      className={period === v ? s.selectedPill : ''}
                      onClick={() => setPeriod(v)}
                    >
                      {v === 'day' ? t.today : v === 'week' ? t.week : t.month}
                    </button>
                  ))}
                </div>
                <label className={s.filter}>
                  <SlidersHorizontal size={16} />
                  <span className={s.srOnly}>{t.filter}</span>
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="all">{t.all}</option>
                    {page === 'finance'
                      ? ['income', 'expense', 'transfer'].map((v) => (
                          <option key={v} value={v}>
                            {v === 'income' ? t.income : v === 'expense' ? t.expense : t.transfer}
                          </option>
                        ))
                      : modules.map((m) => (
                          <option key={m} value={m}>
                            {mt[m]}
                          </option>
                        ))}
                  </select>
                </label>
              </div>
              <div className={s.financeStats}>
                <div>
                  <small>{t.income}</small>
                  <strong>{money(totals.income, lang)}</strong>
                  <ArrowDownLeft size={18} />
                </div>
                <div>
                  <small>{t.expense}</small>
                  <strong>{money(totals.expense, lang)}</strong>
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <small>{lang === 'id' ? 'Selisih tercatat' : 'Recorded difference'}</small>
                  <strong>{money(totals.income - totals.expense, lang)}</strong>
                  <ArrowLeftRight size={18} />
                </div>
              </div>
              {page === 'finance' ? (
                <section className={s.walletSection}>
                  <div className={s.sectionHead}>
                    <h2>{t.wallets}</h2>
                    <button className={s.textButton} onClick={() => setPanel({ kind: 'wallet' })}>
                      <Plus size={16} />
                      {t.newWallet}
                    </button>
                  </div>
                  <div className={s.walletGrid}>
                    {state.wallets.map((w) => (
                      <div key={w.id} className={s.walletCard}>
                        <div>
                          <WalletIcon size={18} />
                          <strong>
                            {w.name}
                            {w.archived ? ' · archived' : ''}
                          </strong>
                        </div>
                        <small>{t.balance}</small>
                        <b>{money(balance(state, w.id), lang)}</b>
                        {balance(state, w.id) < 0 ? (
                          <span className={s.error}>
                            {lang === 'id' ? 'Saldo negatif' : 'Negative balance'}
                          </span>
                        ) : null}
                        {!w.archived ? (
                          <button
                            className={s.textButton}
                            disabled={pending}
                            onClick={() => void save({ action: 'wallet.archive', id: w.id })}
                          >
                            {t.archive}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              <section className={s.timeline}>
                <div className={s.sectionHead}>
                  <div>
                    <h2>{page === 'finance' ? t.transactions : t.history}</h2>
                    <p>
                      {dateLabel(from, { day: 'numeric', month: 'short' })}
                      {from !== to ? ` – ${dateLabel(to, { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  </div>
                  <button
                    className={s.secondaryButton}
                    onClick={() =>
                      setPanel({
                        kind: 'capture',
                        module: page === 'finance' ? 'finance' : undefined,
                      })
                    }
                  >
                    <Plus size={16} />
                    {page === 'finance' ? t.addTransaction : t.record}
                  </button>
                </div>
                {!entries.length ? (
                  <div className={s.empty}>
                    <CalendarDays size={28} />
                    <p>{t.empty}</p>
                  </div>
                ) : (
                  entries.map((e) => (
                    <article key={e.id} className={s.timelineRow}>
                      <span className={s.moduleIcon} data-module={e.module}>
                        <Icon module={e.module} />
                      </span>
                      <div className={s.timelineInfo}>
                        <strong>{e.name}</strong>
                        <small>
                          {dateLabel(e.date, { day: 'numeric', month: 'short' })} · {mt[e.module]}
                          {e.type !== 'log'
                            ? ` · ${state.wallets.find((w) => w.id === e.walletId)?.name ?? ''}${e.type === 'transfer' ? ` → ${state.wallets.find((w) => w.id === e.destinationId)?.name ?? ''}` : ''}`
                            : ''}
                        </small>
                        {e.note ? <p>{e.note}</p> : null}
                      </div>
                      <strong className={s.entryAmount}>
                        {e.type === 'income' ? '+' : e.type === 'expense' ? '−' : ''}
                        {e.type !== 'log'
                          ? money(e.amount, lang)
                          : e.module === 'water'
                            ? `${e.amount} ml`
                            : e.module === 'exercise' || e.module === 'study'
                              ? `${e.amount} min`
                              : e.habitId &&
                                  state.habits.find((h) => h.id === e.habitId)?.kind !== 'checklist'
                                ? `${e.amount} ${state.habits.find((h) => h.id === e.habitId)?.unit ?? ''}`
                                : t.complete}
                      </strong>
                      <div className={s.entryActions}>
                        <button
                          onClick={() =>
                            setPanel({
                              kind: 'capture',
                              entry: e,
                              module: e.module,
                              habit: state.habits.find((h) => h.id === e.habitId),
                            })
                          }
                        >
                          {t.edit}
                        </button>
                        <button onClick={() => setPanel({ kind: 'delete', entry: e })}>
                          {t.remove}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            </>
          ) : null}
          {page === 'settings' ? (
            <div className={s.settingsGrid}>
              <form
                className={s.settingsPanel}
                onSubmit={async (e) => {
                  e.preventDefault();
                  await save({
                    action: 'preferences.update',
                    preferences: prefs,
                    archiveDependents: false,
                  });
                }}
              >
                <h2>{t.profile}</h2>
                <label>
                  {t.name}
                  <input
                    value={prefs.name}
                    maxLength={60}
                    required
                    onChange={(e) => setPrefs({ ...prefs, name: e.target.value })}
                  />
                </label>
                <label>
                  {t.timezone}
                  <input
                    value={prefs.timezone}
                    required
                    onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                  />
                </label>
                <h2>{t.appearance}</h2>
                <label>
                  {t.language}
                  <select
                    value={prefs.language}
                    onChange={(e) =>
                      setPrefs({ ...prefs, language: e.target.value as 'id' | 'en' })
                    }
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <span className={s.fieldLabel}>{t.theme}</span>
                <div className={s.themeOptions}>
                  {(
                    [
                      { v: 'light', Icon: Sun },
                      { v: 'dark', Icon: Moon },
                      { v: 'system', Icon: Monitor },
                    ] as const
                  ).map(({ v, Icon }) => (
                    <button
                      type="button"
                      key={v}
                      aria-pressed={prefs.theme === v}
                      className={prefs.theme === v ? s.selectedPill : ''}
                      onClick={() => setPrefs({ ...prefs, theme: v })}
                    >
                      <Icon size={16} />
                      {t[v]}
                    </button>
                  ))}
                </div>
                <h2>{t.modules}</h2>
                <div className={s.moduleChecks}>
                  {modules.map((m) => (
                    <label key={m}>
                      <input
                        type="checkbox"
                        checked={prefs.enabled.includes(m)}
                        onChange={(e) =>
                          setPrefs({
                            ...prefs,
                            enabled: e.target.checked
                              ? [...prefs.enabled, m]
                              : prefs.enabled.filter((v) => v !== m),
                          })
                        }
                      />
                      <Icon module={m} size={16} />
                      {mt[m]}
                    </label>
                  ))}
                </div>
                <button className={s.primaryButton} disabled={pending}>
                  {pending ? t.saving : t.preferences}
                </button>
                {state.habits.some((h) => !h.archived && !prefs.enabled.includes(h.module)) ? (
                  <button
                    type="button"
                    className={s.secondaryButton}
                    disabled={pending}
                    onClick={() =>
                      void save({
                        action: 'preferences.update',
                        preferences: prefs,
                        archiveDependents: true,
                      })
                    }
                  >
                    {lang === 'id'
                      ? 'Simpan & arsipkan habit terkait'
                      : 'Save & archive dependent habits'}
                  </button>
                ) : null}
              </form>
              <div>
                <section className={s.settingsPanel}>
                  <div className={s.sectionHead}>
                    <h2>{t.habitsManage}</h2>
                    <button
                      className={s.iconButton}
                      aria-label={t.newHabit}
                      onClick={() => setPanel({ kind: 'habit' })}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {state.habits.map((h) => (
                    <div key={h.id} className={s.manageRow}>
                      <span>
                        <strong>{h.name}</strong>
                        <small>
                          {mt[h.module]}
                          {h.archived ? ` · ${t.archive}` : ''}
                        </small>
                      </span>
                      <button
                        className={s.textButton}
                        onClick={() => setPanel({ kind: 'habit', habit: h })}
                      >
                        {t.edit}
                      </button>
                    </div>
                  ))}
                </section>
                <section className={s.settingsPanel}>
                  <h2>{t.access}</h2>
                  <div className={s.manageRow}>
                    <span>
                      <strong>Telegram</strong>
                      <small>{t.notConnected}</small>
                    </span>
                    <LockKeyhole size={18} />
                  </div>
                  <div className={s.manageRow}>
                    <span>
                      <strong>{lang === 'id' ? 'Lisensi & pesanan' : 'License & orders'}</strong>
                      <small>
                        {lang === 'id' ? 'Pembelian belum dibuka' : 'Purchases are not open'}
                      </small>
                    </span>
                    <LockKeyhole size={18} />
                  </div>
                  <p className={s.help}>
                    {lang === 'id'
                      ? 'Feed belum diaktifkan. Pencatatan selalu privat dan tidak menerbitkan posting otomatis.'
                      : 'Feed is not enabled. Logging is always private and never publishes automatically.'}
                  </p>
                </section>
                <section className={s.settingsPanel}>
                  <h2>{t.data}</h2>
                  <p className={s.help}>
                    {preview
                      ? lang === 'id'
                        ? 'Ekspor ini hanya berisi data sintetis pratinjau. Perubahan akan hilang saat halaman dimuat ulang.'
                        : 'This export contains only synthetic preview data. Changes are lost on reload.'
                      : lang === 'id'
                        ? 'Unduh salinan catatan yang dimuat di halaman ini. Simpan berkasnya di tempat privat.'
                        : 'Download a copy of the records loaded on this page. Keep the file private.'}
                  </p>
                  <button className={s.secondaryButton} onClick={exportData}>
                    <Download size={17} />
                    {t.export}
                  </button>
                  {preview ? (
                    <button
                      className={s.textButton}
                      onClick={() => {
                        setState({ ...previewState(), habits: [], entries: [], wallets: [] });
                        setMessage(
                          lang === 'id' ? 'Data pratinjau dikosongkan.' : 'Preview data cleared.',
                        );
                      }}
                    >
                      {lang === 'id' ? 'Kosongkan data pratinjau' : 'Clear preview data'}
                    </button>
                  ) : null}
                </section>
              </div>
            </div>
          ) : null}
          <footer className={s.footer}>
            <span>HabitTracker</span>
            <span>
              {lang === 'id' ? 'Langkah kecil tetap berarti.' : 'Small steps still count.'}
            </span>
          </footer>
        </main>
      </div>
      {panel ? (
        <Modal
          title={
            panel.kind === 'habit'
              ? panel.habit
                ? t.edit
                : t.newHabit
              : panel.kind === 'wallet'
                ? t.newWallet
                : panel.kind === 'delete'
                  ? t.remove
                  : panel.entry
                    ? t.edit
                    : panel.module === 'finance'
                      ? t.addTransaction
                      : t.record
          }
          close={() => {
            if (!pending) setPanel(null);
          }}
          closeLabel={t.close}
        >
          {panel.kind === 'capture' ? (
            <CaptureForm
              key={panel.entry?.id ?? panel.habit?.id ?? panel.module ?? 'capture'}
              panel={panel}
              state={state}
              selected={selected}
              pending={pending}
              lang={lang}
              onSave={save}
              close={() => setPanel(null)}
            />
          ) : panel.kind === 'habit' ? (
            <HabitForm
              habit={panel.habit}
              state={state}
              pending={pending}
              lang={lang}
              onSave={save}
              close={() => setPanel(null)}
            />
          ) : panel.kind === 'wallet' ? (
            <WalletForm lang={lang} pending={pending} onSave={save} close={() => setPanel(null)} />
          ) : (
            <div className={s.form}>
              <p>
                {lang === 'id'
                  ? 'Hapus catatan ini? Progres dan saldo akan dihitung ulang.'
                  : 'Delete this record? Progress and balances will be recalculated.'}
              </p>
              <strong>{panel.entry.name}</strong>
              <button
                className={s.dangerButton}
                disabled={pending}
                onClick={async () => {
                  if (
                    await save({
                      action: 'entry.delete',
                      id: panel.entry.id,
                      version: panel.entry.version,
                    })
                  )
                    setPanel(null);
                }}
              >
                {pending ? t.saving : t.remove}
              </button>
            </div>
          )}
          {error ? (
            <p className={s.formError} role="alert">
              {error}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
function CaptureForm({
  panel,
  state,
  selected,
  pending,
  lang,
  onSave,
  close,
}: {
  panel: Extract<NonNullable<Panel>, { kind: 'capture' }>;
  state: State;
  selected: string;
  pending: boolean;
  lang: 'id' | 'en';
  onSave: (c: Command) => Promise<boolean>;
  close: () => void;
}) {
  const t = copy[lang];
  const mt = moduleCopy[lang];
  const [module, setModule] = useState<Module>(panel.module ?? 'exercise');
  const [type, setType] = useState<Entry['type']>(
    panel.entry?.type ?? (module === 'finance' ? 'expense' : 'log'),
  );
  const [habitId, setHabit] = useState(panel.habit?.id ?? panel.entry?.habitId ?? '');
  const [name, setName] = useState(panel.entry?.name ?? panel.habit?.name ?? '');
  const [amount, setAmount] = useState(
    String(
      panel.entry?.amount ??
        (panel.habit?.kind === 'checklist'
          ? 1
          : module === 'water'
            ? 250
            : module === 'exercise' || module === 'study'
              ? 30
              : ''),
    ),
  );
  const [date, setDate] = useState(panel.entry?.date ?? selected);
  const [time, setTime] = useState(
    panel.entry
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: panel.entry.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(new Date(panel.entry.occurredAt))
      : new Intl.DateTimeFormat('en-GB', {
          timeZone: state.preferences.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(new Date()),
  );
  const [walletId, setWallet] = useState(
    panel.entry?.walletId ?? state.wallets.find((w) => !w.archived)?.id ?? '',
  );
  const [destination, setDestination] = useState(panel.entry?.destinationId ?? '');
  const [category, setCategory] = useState(panel.entry?.category ?? '');
  const [method, setMethod] = useState(panel.entry?.method ?? 'cash');
  const [note, setNote] = useState(panel.entry?.note ?? '');
  const current = state.habits.find((h) => h.id === habitId);
  const timezone = panel.entry?.timezone ?? state.preferences.timezone;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const occurredAt = zonedInstant(date, time, timezone);
    const value: Omit<Entry, 'id' | 'version' | 'deleted'> = {
      module,
      date,
      occurredAt,
      timezone,
      name: name.trim() || current?.name || mt[module],
      amount: Number(amount),
      habitId: module === 'water' || type !== 'log' ? null : habitId || null,
      type,
      walletId: type === 'log' ? null : walletId || null,
      destinationId: type === 'transfer' ? destination || null : null,
      category,
      method: type === 'log' ? '' : method,
      note,
    };
    if (
      await onSave(
        panel.entry
          ? { action: 'entry.edit', id: panel.entry.id, version: panel.entry.version, entry: value }
          : { action: 'entry.create', entry: value },
      )
    )
      close();
  }
  return (
    <form className={s.form} onSubmit={submit}>
      <label>
        {t.module}
        <select
          disabled={!!panel.entry || !!panel.habit}
          value={module}
          onChange={(e) => {
            const m = e.target.value as Module;
            setModule(m);
            setType(m === 'finance' ? 'expense' : 'log');
            setHabit('');
            setAmount(m === 'water' ? '250' : m === 'exercise' || m === 'study' ? '30' : '1');
          }}
        >
          {modules
            .filter((m) => state.preferences.enabled.includes(m) || m === panel.entry?.module)
            .map((m) => (
              <option key={m} value={m}>
                {mt[m]}
              </option>
            ))}
        </select>
      </label>
      {module === 'finance' ? (
        <label>
          {t.transactions}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as Entry['type']);
              setHabit('');
            }}
          >
            <option value="expense">{t.expense}</option>
            <option value="income">{t.income}</option>
            <option value="transfer">{t.transfer}</option>
            <option value="log">{t.checklist}</option>
          </select>
        </label>
      ) : null}
      {type === 'log' && module !== 'water' && module !== 'reflection' ? (
        <label>
          {t.habitsManage}
          <select
            value={habitId}
            disabled={!!panel.habit}
            required={module === 'custom' || module === 'fasting' || module === 'finance'}
            onChange={(e) => {
              setHabit(e.target.value);
              const h = state.habits.find((h) => h.id === e.target.value);
              if (h?.kind === 'checklist') setAmount('1');
            }}
          >
            <option value="">{lang === 'id' ? 'Tidak ditautkan' : 'Not linked'}</option>
            {state.habits
              .filter((h) => h.module === module)
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
          </select>
        </label>
      ) : null}
      <label>
        {t.name}
        <input
          maxLength={100}
          value={name}
          placeholder={current?.name ?? mt[module]}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className={s.twoFields}>
        <label>
          {t.amount}
          {type !== 'log'
            ? ' (IDR)'
            : module === 'water'
              ? ' (ml)'
              : module === 'exercise' || module === 'study'
                ? ' (min)'
                : current?.unit
                  ? ` (${current.unit})`
                  : ''}
          <input
            type="number"
            inputMode="numeric"
            required
            min="1"
            max="1000000000000"
            step="1"
            disabled={current?.kind === 'checklist'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          {t.date}
          <input
            type="date"
            required
            max={localDate(new Date(), timezone)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <label>
        {t.time} ({timezone})
        <input type="time" value={time} required onChange={(e) => setTime(e.target.value)} />
      </label>
      {type !== 'log' ? (
        <>
          <label>
            {t.wallet}
            <select required value={walletId} onChange={(e) => setWallet(e.target.value)}>
              <option value="">—</option>
              {state.wallets
                .filter((w) => !w.archived || w.id === panel.entry?.walletId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </label>
          {type === 'transfer' ? (
            <label>
              {t.destination}
              <select value={destination} required onChange={(e) => setDestination(e.target.value)}>
                <option value="">—</option>
                {state.wallets
                  .filter(
                    (w) =>
                      (!w.archived || w.id === panel.entry?.destinationId) && w.id !== walletId,
                  )
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <label>
              {t.category}
              <input
                required
                maxLength={60}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
          )}
          <label>
            {t.method}
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">{lang === 'id' ? 'Tunai' : 'Cash'}</option>
              <option value="debit">Debit</option>
              <option value="bank">{lang === 'id' ? 'Transfer bank' : 'Bank transfer'}</option>
              <option value="other">{t.other}</option>
            </select>
          </label>
        </>
      ) : null}
      <label>
        {t.note}
        <textarea
          maxLength={2000}
          value={note}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {module === 'fasting' ? (
        <p className={s.help}>
          {lang === 'id'
            ? 'Simpan hanya jika kamu mengonfirmasi fasting sudah selesai. Tanggal adalah tanggal lokal mulai.'
            : 'Save only when you confirm fasting is complete. Use the local start date.'}
        </p>
      ) : null}
      <div className={s.formActions}>
        <button type="button" className={s.secondaryButton} disabled={pending} onClick={close}>
          {t.cancel}
        </button>
        <button className={s.primaryButton} disabled={pending}>
          {pending ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}
function zonedInstant(date: string, time: string, timezone: string) {
  const naive = Date.parse(`${date}T${time}:00Z`);
  let guess = naive;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(guess));
    const part = (type: string) => parts.find((p) => p.type === type)?.value;
    const asUTC = Date.parse(
      `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}Z`,
    );
    guess += naive - asUTC;
  }
  return new Date(guess).toISOString();
}
function HabitForm({
  habit,
  state,
  pending,
  lang,
  onSave,
  close,
}: {
  habit?: Habit;
  state: State;
  pending: boolean;
  lang: 'id' | 'en';
  onSave: (c: Command) => Promise<boolean>;
  close: () => void;
}) {
  const t = copy[lang];
  const [name, setName] = useState(habit?.name ?? '');
  const [module, setModule] = useState<Module>(habit?.module ?? 'custom');
  const [kind, setKind] = useState<Habit['kind']>(habit?.kind ?? 'checklist');
  const [target, setTarget] = useState(String(habit?.rules.at(-1)?.target ?? 1));
  const [unit, setUnit] = useState(habit?.unit ?? '');
  const [days, setDays] = useState(habit?.rules.at(-1)?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const today = localDate(new Date(), state.preferences.timezone);
  const [effective, setEffective] = useState(habit ? shiftDate(today, 1) : today);
  return (
    <form
      className={s.form}
      onSubmit={async (e) => {
        e.preventDefault();
        const c: Command = habit
          ? { action: 'habit.rule', id: habit.id, target: Number(target), days, effective }
          : {
              action: 'habit.create',
              name,
              module,
              kind,
              target: kind === 'checklist' ? 1 : Number(target),
              unit,
              days,
              effective,
            };
        if (await onSave(c)) close();
      }}
    >
      <label>
        {t.name}
        <input
          required
          disabled={!!habit}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        {t.module}
        <select
          value={module}
          disabled={!!habit}
          onChange={(e) => {
            const m = e.target.value as Module;
            setModule(m);
            if (m === 'fasting' || m === 'finance') setKind('checklist');
            else if (m === 'water') {
              setKind('count');
              setUnit('ml');
            } else if (m === 'exercise' || m === 'study') {
              setKind('duration');
              setUnit('min');
            }
          }}
        >
          {modules
            .filter((m) => m !== 'reflection' && state.preferences.enabled.includes(m))
            .map((m) => (
              <option key={m} value={m}>
                {moduleCopy[lang][m]}
              </option>
            ))}
        </select>
      </label>
      <label>
        {t.target}
        <select
          value={kind}
          disabled={
            !!habit ||
            module === 'finance' ||
            module === 'fasting' ||
            module === 'water' ||
            module === 'study'
          }
          onChange={(e) => {
            setKind(e.target.value as Habit['kind']);
            if (e.target.value === 'checklist') setTarget('1');
          }}
        >
          {module !== 'exercise' ? <option value="checklist">{t.checklist}</option> : null}
          <option value="count">{t.count}</option>
          <option value="duration">{t.duration}</option>
        </select>
      </label>
      {kind !== 'checklist' ? (
        <div className={s.twoFields}>
          <label>
            {t.amount}
            <input
              required
              type="number"
              min="1"
              max="1000000000000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <label>
            {t.unit}
            <input
              required
              maxLength={20}
              disabled={!!habit || module === 'water'}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </label>
        </div>
      ) : null}
      <span className={s.fieldLabel}>{t.days}</span>
      <div className={s.dayChecks}>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button
            key={d}
            type="button"
            className={days.includes(d) ? s.selectedPill : ''}
            aria-pressed={days.includes(d)}
            onClick={() => setDays(days.includes(d) ? days.filter((v) => v !== d) : [...days, d])}
          >
            {new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
              weekday: 'short',
              timeZone: 'UTC',
            }).format(new Date(Date.UTC(2026, 9, 4 + d)))}
          </button>
        ))}
      </div>
      <label>
        {lang === 'id' ? 'Berlaku mulai' : 'Effective from'}
        <input
          type="date"
          min={habit ? shiftDate(today, 1) : today}
          required
          value={effective}
          onChange={(e) => setEffective(e.target.value)}
        />
      </label>
      {habit ? (
        <p className={s.help}>
          {lang === 'id'
            ? 'Target baru tidak mengubah riwayat sebelumnya.'
            : 'New targets preserve previous history.'}
        </p>
      ) : null}
      <div className={s.formActions}>
        <button type="button" className={s.secondaryButton} onClick={close} disabled={pending}>
          {t.cancel}
        </button>
        <button className={s.primaryButton} disabled={pending || !days.length}>
          {pending ? t.saving : t.save}
        </button>
      </div>
      {habit && !habit.archived ? (
        <button
          type="button"
          className={s.textButton}
          disabled={pending}
          onClick={async () => {
            if (await onSave({ action: 'habit.archive', id: habit.id, effective })) close();
          }}
        >
          {t.archive}
        </button>
      ) : null}
    </form>
  );
}
function WalletForm({
  lang,
  pending,
  onSave,
  close,
}: {
  lang: 'id' | 'en';
  pending: boolean;
  onSave: (c: Command) => Promise<boolean>;
  close: () => void;
}) {
  const t = copy[lang];
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('0');
  return (
    <form
      className={s.form}
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSave({ action: 'wallet.create', name, opening: Number(opening) })) close();
      }}
    >
      <label>
        {t.name}
        <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {lang === 'id' ? 'Saldo awal (bukan pemasukan)' : 'Opening balance (not income)'}
        <input
          required
          type="number"
          step="1"
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
        />
      </label>
      <button className={s.primaryButton} disabled={pending}>
        {pending ? t.saving : t.save}
      </button>
    </form>
  );
}
