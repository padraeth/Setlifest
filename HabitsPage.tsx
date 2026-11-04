import { useState, type FormEvent } from 'react';
import { Activity, CalendarDays, Check, ChevronDown, Flame, HeartHandshake, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { Habit, HabitKind, HabitLog } from '../../../shared/types';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useToast } from '../../components/Feedback';
import { Badge, Button, Field, Modal, PageHeading, ProgressBar, SelectField, TextAreaField } from '../../components/ui';
import { habitBestStreak, habitCompletionPercent, habitCurrentStreak, localDateKey, reductionTargetPercent, scheduledOn } from '../../lib/calculations';
import { newId, todayKey } from '../../lib/format';
import { habitInputSchema } from '../../lib/validation';

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const accents = ['#3168F5', '#c78b57', '#668d7b', '#8b75b8', '#d07b7b', '#5b899d'];

export function HabitsPage() {
  const { workspace, createRecord, updateRecord, deleteRecord } = useWorkspace();
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [filter, setFilter] = useState<'all' | HabitKind>('all');
  const [lapseHabit, setLapseHabit] = useState<Habit | null>(null);
  const [lapseNote, setLapseNote] = useState('');
  const [deleteHabit, setDeleteHabit] = useState<Habit | null>(null);
  const [historyHabitId, setHistoryHabitId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayKey();
  const habits = workspace.habits.filter((habit) => filter === 'all' || habit.kind === filter);
  const completeCount = workspace.habits.filter((habit) => workspace.habitLogs.some((log) => log.habitId === habit.id && log.date === today && (log.kind === 'complete' || (habit.kind === 'reduction' && log.kind === 'avoid')))).length;
  const firstOfWeek = new Date();
  firstOfWeek.setDate(firstOfWeek.getDate() - ((firstOfWeek.getDay() - workspace.preferences.weekStartsOn + 7) % 7));
  const calendarDays = Array.from({ length: 7 }, (_, offset) => { const date = new Date(firstOfWeek); date.setDate(date.getDate() + offset); return { key: localDateKey(date), date }; });
  const historyStart = new Date();
  historyStart.setDate(historyStart.getDate() - 29);
  const historyDays = Array.from({ length: 30 }, (_, offset) => { const date = new Date(historyStart); date.setDate(date.getDate() + offset); return { key: localDateKey(date), date }; });
  const reductionWins = workspace.habitLogs.filter((log) => log.kind === 'avoid' && log.date >= calendarDays[0].key && log.date <= today).length;

  async function saveHabit(values: Omit<Habit, 'id' | 'createdAt'>) {
    setBusy(true);
    try {
      const payload = { ...values, id: editing?.id ?? newId(), createdAt: editing?.createdAt ?? new Date().toISOString() };
      const parsed = habitInputSchema.safeParse(values);
      if (!parsed.success) { notify(parsed.error.issues[0]?.message ?? 'Check the habit details.', 'error'); return; }
      if (editing) await updateRecord('habits', payload, editing.id);
      else await createRecord('habits', payload);
      setFormOpen(false); setEditing(null); notify(editing ? 'Habit updated.' : 'Your new rhythm is ready.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not save this habit.', 'error'); }
    finally { setBusy(false); }
  }

  async function logHabit(habit: Habit, kind: HabitLog['kind'], note = '') {
    try {
      if (kind === 'complete' || kind === 'skip') {
        const existing = workspace.habitLogs.find((log) => log.habitId === habit.id && log.date === today && log.kind === kind);
        if (existing) { await deleteRecord('habitLogs', existing.id); notify(kind === 'skip' ? 'Rest-day note removed.' : 'Habit reopened.'); return; }
        const conflicting = workspace.habitLogs.find((log) => log.habitId === habit.id && log.date === today && log.kind === (kind === 'complete' ? 'skip' : 'complete'));
        if (conflicting) await deleteRecord('habitLogs', conflicting.id);
      }
      await createRecord('habitLogs', { id: newId(), habitId: habit.id, date: today, kind, note, createdAt: new Date().toISOString() });
      notify(kind === 'lapse' ? 'Noted without judgement. Your history still counts.' : kind === 'skip' ? 'Rest day noted.' : kind === 'avoid' ? 'Choice recorded.' : 'Habit complete.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not save this check-in.', 'error'); }
  }

  async function confirmDelete() {
    if (!deleteHabit) return;
    try { await deleteRecord('habits', deleteHabit.id); setDeleteHabit(null); notify('Habit and its check-ins removed.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not remove this habit.', 'error'); }
  }

  return <div className="page">
    <PageHeading eyebrow="THE PRACTICES THAT SHAPE YOU" title="Habits" description="Build what you want more of. Notice what you’re ready to loosen." action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> New habit</Button>} />
    <section className="habit-overview-strip"><div className="habit-overview-lead"><span className="overview-icon blue"><Sparkles size={18} /></span><div><span className="small-kicker">TODAY, SO FAR</span><strong>{completeCount} habits checked in</strong></div></div><div className="overview-divider" /><div className="habit-overview-stat"><span className="overview-icon amber"><HeartHandshake size={17} /></span><div><strong>{reductionWins}</strong><small>small choices this week</small></div></div><div className="overview-orbit"><div /></div></section>
    <div className="module-toolbar"><div className="filter-pills" role="tablist" aria-label="Filter habits">{(['all', 'positive', 'reduction'] as const).map((value) => <button type="button" role="tab" aria-selected={filter === value} className={filter === value ? 'filter-pill selected' : 'filter-pill'} onClick={() => setFilter(value)} key={value}>{value === 'all' ? 'All rhythms' : value === 'positive' ? 'Build' : 'Reduce'}<span>{value === 'all' ? workspace.habits.length : workspace.habits.filter((habit) => habit.kind === value).length}</span></button>)}</div><span className="toolbar-note"><CalendarDays size={14} /> This week, at a glance</span></div>
    {habits.length === 0 ? <div className="empty-module"><div className="empty-orbit"><Sparkles size={27} /></div><p className="eyebrow">A NEW KIND OF CONSISTENCY</p><h2>{workspace.habits.length ? 'No habits in this view.' : 'Start with what feels possible.'}</h2><p>{workspace.habits.length ? 'Switch filters to see the other kind of habit.' : 'One gentle practice, repeated, can change the texture of a day.'}</p>{!workspace.habits.length && <Button onClick={() => setFormOpen(true)}><Plus size={16} /> Create your first habit</Button>}</div> : <div className="habit-grid">{habits.map((habit, index) => {
      const logs = workspace.habitLogs.filter((log) => log.habitId === habit.id);
      const weekPercent = habit.kind === 'reduction'
        ? reductionTargetPercent(habit, logs, workspace.preferences.weekStartsOn)
        : habitCompletionPercent(habit, logs, 7, new Date(), workspace.preferences.weekStartsOn);
      const streakKind = habit.kind === 'reduction' ? 'avoid' : 'complete';
      const streak = habitCurrentStreak(habit, logs, new Date(), streakKind);
      const bestStreak = habitBestStreak(habit, logs, streakKind);
      const weekEvents = logs.filter((log) => log.date >= calendarDays[0].key && log.date <= today && log.kind === streakKind);
      const weekProgressCount = habit.frequency === 'weekly' && habit.kind === 'reduction' ? weekEvents.length : new Set(weekEvents.map((log) => log.date)).size;
      const checkedToday = logs.some((log) => log.date === today && log.kind === 'complete');
      const weekDays = calendarDays.map(({ key, date }) => ({ key, date, scheduled: scheduledOn(habit, date), done: logs.some((log) => log.date === key && log.kind === 'complete'), lapse: logs.some((log) => log.date === key && log.kind === 'lapse'), avoid: logs.some((log) => log.date === key && log.kind === 'avoid'), skip: logs.some((log) => log.date === key && log.kind === 'skip') }));
      const missedThisWeek = habit.kind === 'positive' && habit.frequency === 'daily' ? weekDays.filter((item) => item.key <= today && item.scheduled && !item.done && !item.lapse && !item.skip).length : 0;
      const monthKey = today.slice(0, 7);
      const monthLogs = logs.filter((log) => log.date.startsWith(monthKey));
      const monthSummary = habit.kind === 'positive'
        ? `${monthLogs.filter((log) => log.kind === 'complete').length} check-ins this month`
        : `${monthLogs.filter((log) => log.kind === 'avoid').length} choices · ${monthLogs.filter((log) => log.kind === 'lapse').length} lapses this month`;
      const historyForMonth = historyDays.map(({ key, date }) => ({ key, date, scheduled: scheduledOn(habit, date), done: logs.some((log) => log.date === key && (log.kind === 'complete' || (habit.kind === 'reduction' && log.kind === 'avoid'))), lapse: logs.some((log) => log.date === key && log.kind === 'lapse'), skip: logs.some((log) => log.date === key && log.kind === 'skip') }));
      return <article className={`habit-card habit-card-${habit.kind}`} key={habit.id} style={{ animationDelay: `${index * 55}ms` }}>
        <div className="habit-card-head"><span className="habit-icon-wrap" style={{ '--habit-accent': habit.accent } as React.CSSProperties}>{habit.kind === 'positive' ? <Sparkles size={18} /> : <HeartHandshake size={18} />}</span><div className="habit-card-menu"><Badge tone={habit.kind === 'positive' ? 'blue' : 'violet'}>{habit.kind === 'positive' ? 'Build' : 'Reduce'}</Badge><button type="button" className="icon-button tiny-icon" aria-label={`Edit ${habit.name}`} onClick={() => { setEditing(habit); setFormOpen(true); }}><Pencil size={14} /></button><button type="button" className="icon-button tiny-icon" aria-label={`Delete ${habit.name}`} onClick={() => setDeleteHabit(habit)}><Trash2 size={14} /></button></div></div>
        <p className="habit-category">{habit.category || 'PERSONAL'}</p><h3>{habit.name}</h3>{habit.description && <p className="habit-description">{habit.description}</p>}
        <div className="habit-metrics"><div><strong>{streak}</strong><small>{habit.kind === 'positive' ? `day rhythm · best ${bestStreak}` : `avoidance · best ${bestStreak}`}</small></div><div className="metric-line" /><div><strong>{habit.kind === 'positive' ? `${weekPercent}%` : logs.filter((log) => log.kind === 'lapse' && log.date >= shiftDate(today, -6) && log.date <= today).length}</strong><small>{habit.kind === 'positive' ? habit.frequency === 'weekly' ? 'weekly target reached' : `${missedThisWeek} missed this week` : 'lapses · 7 days'}</small></div><span className="metric-watermark">{habit.kind === 'positive' ? <Flame size={27} /> : <Activity size={27} />}</span></div>
        <div className="habit-week"><div className="week-dots">{weekDays.map((item) => <span key={item.key} className={`week-day ${!item.scheduled || item.skip ? 'day-rest' : item.done || item.avoid ? 'day-done' : item.lapse ? 'day-lapse' : ''}`} title={`${item.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}${item.skip ? ' · rest day noted' : item.lapse ? ' · recorded lapse' : item.avoid ? ' · avoidance recorded' : item.done ? ' · completed' : !item.scheduled ? ' · rest day' : ''}`}><i>{dayLabels[item.date.getDay()]}</i><b>{item.done || item.avoid ? <Check size={10} /> : item.lapse ? '·' : ''}</b></span>)}</div><div className="habit-week-progress"><ProgressBar value={weekPercent} color={habit.accent} /><span>{habit.frequency === 'weekly' ? `${weekProgressCount}/${habit.weeklyTarget} this week` : habit.kind === 'reduction' ? 'Avoidance days' : 'Weekly consistency'}</span></div></div>
        <div className="habit-history-summary"><span>{monthSummary}</span><button type="button" aria-expanded={historyHabitId === habit.id} aria-controls={`habit-history-${habit.id}`} onClick={() => setHistoryHabitId((current) => current === habit.id ? null : habit.id)}>{historyHabitId === habit.id ? 'Hide history' : '30-day history'}<ChevronDown size={12} /></button></div>
        {historyHabitId === habit.id && <div className="habit-history-grid" id={`habit-history-${habit.id}`} aria-label={`30-day history for ${habit.name}`}>{historyForMonth.map((item) => { const state = item.skip || !item.scheduled ? 'history-rest' : item.done ? 'history-done' : item.lapse ? 'history-lapse' : item.key < today && habit.kind === 'positive' ? 'history-missed' : 'history-pending'; const label = item.skip ? 'rest day noted' : item.done ? habit.kind === 'reduction' ? 'avoidance recorded' : 'completed' : item.lapse ? 'lapse recorded' : !item.scheduled ? 'not scheduled' : item.key < today ? 'not checked in' : 'today'; return <span key={item.key} className={`history-day ${state}`} role="img" aria-label={`${item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${label}`} title={`${item.key} · ${label}`}><i>{item.date.getDate()}</i></span>; })}</div>}
        <div className="habit-card-actions">{habit.kind === 'positive' ? <Button variant={checkedToday ? 'secondary' : 'primary'} size="sm" onClick={() => void logHabit(habit, 'complete')}>{checkedToday ? <><Check size={14} /> Done today</> : <>Check in <ArrowNarrow size={14} /></>}</Button> : <><Button variant="secondary" size="sm" onClick={() => void logHabit(habit, 'avoid')}><HeartHandshake size={14} /> I chose differently</Button><Button variant="quiet" size="sm" onClick={() => { setLapseHabit(habit); setLapseNote(''); }}>Record a lapse</Button></>}
        {habit.kind === 'positive' && <button type="button" className="skip-link" onClick={() => void logHabit(habit, 'skip')}>Rest today</button>}</div>
      </article>;
    })}</div>}

    <Modal open={formOpen} title={editing ? 'Adjust your habit' : 'Make a little room'} description="Choose a rhythm that fits your actual life." onClose={() => { setFormOpen(false); setEditing(null); }}>
      <HabitForm key={editing?.id ?? 'new'} initial={editing} busy={busy} onCancel={() => { setFormOpen(false); setEditing(null); }} onSave={saveHabit} />
    </Modal>
    <Modal open={Boolean(lapseHabit)} title="A moment, not a verdict" description="If it helps, make a note of what was around the moment. Your progress still counts." onClose={() => setLapseHabit(null)} size="sm">
      <div className="modal-body"><TextAreaField label="Optional note" value={lapseNote} onChange={(event) => setLapseNote(event.target.value)} placeholder="What was happening?" rows={3} /><div className="form-actions"><Button variant="secondary" onClick={() => setLapseHabit(null)}>Not now</Button><Button onClick={async () => { if (lapseHabit) await logHabit(lapseHabit, 'lapse', lapseNote); setLapseHabit(null); }}>Record without judgement</Button></div></div>
    </Modal>
    <Modal open={Boolean(deleteHabit)} title="Remove this habit?" description="Its history and linked check-ins will also be removed. This cannot be undone." onClose={() => setDeleteHabit(null)} size="sm"><div className="modal-body"><p className="modal-copy">Remove <strong>{deleteHabit?.name}</strong> and its habit log history?</p><div className="form-actions"><Button variant="secondary" onClick={() => setDeleteHabit(null)}>Keep habit</Button><Button variant="danger" onClick={() => void confirmDelete()}>Remove habit</Button></div></div></Modal>
  </div>;
}

function HabitForm({ initial, busy, onCancel, onSave }: { initial: Habit | null; busy: boolean; onCancel: () => void; onSave: (values: Omit<Habit, 'id' | 'createdAt'>) => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'Personal');
  const [kind, setKind] = useState<HabitKind>(initial?.kind ?? 'positive');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>(initial?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [1, 2, 3, 4, 5]);
  const [weeklyTarget, setWeeklyTarget] = useState(initial?.weeklyTarget ?? 5);
  const [reminderTime, setReminderTime] = useState(initial?.reminderTime ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayKey());
  const [durationDays, setDurationDays] = useState(initial?.durationDays ?? null);
  const [accent, setAccent] = useState(initial?.accent ?? accents[0]);
  const [error, setError] = useState('');
  function toggleDay(day: number) { setWeekdays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort()); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const result = habitInputSchema.safeParse({ name, description, category, kind, icon: kind === 'positive' ? 'sparkles' : 'heart', frequency, weekdays, weeklyTarget, reminderTime, startDate, durationDays, accent });
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Please check the habit details.'); return; }
    await onSave(result.data);
  }
  return <form className="modal-body form-stack" onSubmit={submit}>
    <Field label="Habit name" value={name} onChange={(event) => setName(event.target.value)} placeholder="A practice worth returning to" maxLength={100} required autoFocus />
    <TextAreaField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A little context for future you" rows={2} />
    <div className="form-grid"><SelectField label="Kind" value={kind} onChange={(event) => setKind(event.target.value as HabitKind)}><option value="positive">Build a habit</option><option value="reduction">Reduce a habit</option></SelectField><Field label="Category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Personal, health…" maxLength={60} /></div>
    <fieldset className="field fieldset"><legend className="field-label">Frequency</legend><div className="choice-row"><button type="button" className={frequency === 'daily' ? 'choice selected' : 'choice'} onClick={() => setFrequency('daily')}>Daily rhythm</button><button type="button" className={frequency === 'weekly' ? 'choice selected' : 'choice'} onClick={() => setFrequency('weekly')}>Weekly target</button></div></fieldset>
    <div className="weekday-picker" aria-label="Select scheduled weekdays">{dayLabels.map((label, day) => <button type="button" key={day} aria-pressed={weekdays.includes(day)} className={weekdays.includes(day) ? 'weekday selected' : 'weekday'} onClick={() => toggleDay(day)}>{label}</button>)}</div>
    {frequency === 'weekly' && <Field label="Target days each week" type="number" min={1} max={7} value={weeklyTarget} onChange={(event) => setWeeklyTarget(Number(event.target.value))} />}
    <div className="form-grid"><Field label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><Field label="Reminder time (optional)" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></div>
    <Field label="Target duration in days (optional)" type="number" min={1} value={durationDays ?? ''} onChange={(event) => setDurationDays(event.target.value ? Number(event.target.value) : null)} placeholder="Leave open-ended" />
    <div className="field"><span className="field-label">Accent color</span><div className="color-picker">{accents.map((color) => <button type="button" key={color} aria-label={`Use ${color} accent`} aria-pressed={accent === color} onClick={() => setAccent(color)} className={accent === color ? 'color-choice color-selected' : 'color-choice'} style={{ backgroundColor: color }} />)}</div></div>
    {error && <p className="field-error form-error" role="alert">{error}</p>}
    <div className="form-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create habit'}</Button></div>
  </form>;
}

function shiftDate(date: string, amount: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + amount); return localDateKey(value); }
function ArrowNarrow({ size }: { size: number }) { return <ChevronDown size={size} className="arrow-narrow" />; }
