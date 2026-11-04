import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, Check, CircleDot, Flag, GitBranch, History, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import type { Goal, GoalReview, ProgressMode } from '../../../shared/types';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useToast } from '../../components/Feedback';
import { Badge, Button, Field, Modal, PageHeading, ProgressBar, SelectField, TextAreaField } from '../../components/ui';
import { goalProgress, hasGoalCycle } from '../../lib/calculations';
import { formatDate, isPast, newId, todayKey } from '../../lib/format';
import { goalInputSchema, goalReviewInputSchema } from '../../lib/validation';

export function GoalsPage() {
  const { workspace, createRecord, updateRecord, deleteRecord } = useWorkspace();
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [reviewGoal, setReviewGoal] = useState<Goal | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [filter, setFilter] = useState<'active' | 'all' | 'completed'>('active');
  const [busy, setBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const goals = workspace.goals.filter((goal) => filter === 'all' ? goal.status !== 'archived' : filter === 'completed' ? goal.status === 'completed' : goal.status === 'active');
  const average = useMemo(() => {
    const active = workspace.goals.filter((goal) => goal.status === 'active');
    return active.length ? Math.round(active.reduce((sum, goal) => sum + goalProgress(goal, workspace.milestones, workspace.tasks), 0) / active.length) : 0;
  }, [workspace.goals, workspace.milestones, workspace.tasks]);

  async function saveGoal(values: Omit<Goal, 'id' | 'createdAt'>) {
    setBusy(true);
    const goal: Goal = { ...values, id: editing?.id ?? newId(), createdAt: editing?.createdAt ?? new Date().toISOString() };
    const parsed = goalInputSchema.safeParse(goal);
    if (!parsed.success) { notify(parsed.error.issues[0]?.message ?? 'Check the goal details.', 'error'); setBusy(false); return; }
    try {
      if (editing) await updateRecord('goals', goal, goal.id);
      else await createRecord('goals', goal);
      setFormOpen(false); setEditing(null); notify(editing ? 'Goal updated.' : 'A new direction is on the board.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not save this goal.', 'error'); }
    finally { setBusy(false); }
  }

  async function addMilestone(goal: Goal) {
    const title = window.prompt('Milestone name');
    if (!title?.trim()) return;
    try { await createRecord('milestones', { id: newId(), goalId: goal.id, title: title.trim(), dueDate: '', completed: false }); notify('Milestone added.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not add milestone.', 'error'); }
  }
  async function toggleMilestone(milestone: typeof workspace.milestones[number]) {
    try { await updateRecord('milestones', { ...milestone, completed: !milestone.completed }, milestone.id); notify(milestone.completed ? 'Milestone reopened.' : 'Milestone reached.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not update milestone.', 'error'); }
  }
  async function changeStatus(goal: Goal, status: Goal['status']) {
    try { await updateRecord('goals', { ...goal, status }, goal.id); notify(status === 'archived' ? 'Goal archived.' : status === 'completed' ? 'Goal complete. Take a moment with that.' : 'Goal reopened.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not update the goal.', 'error'); }
  }
  async function confirmDelete() {
    if (!deleteGoal) return;
    try { await deleteRecord('goals', deleteGoal.id); setDeleteGoal(null); notify('Goal removed.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'This goal still has linked items. Unlink or move them before deleting.', 'error'); }
  }

  async function saveReview(event: FormEvent) {
    event.preventDefault();
    if (!reviewGoal) return;
    const review: GoalReview = { id: newId(), goalId: reviewGoal.id, reviewedAt: new Date().toISOString(), progress: goalProgress(reviewGoal, workspace.milestones, workspace.tasks), note: reviewNote.trim() };
    const parsed = goalReviewInputSchema.safeParse(review);
    if (!parsed.success) { notify(parsed.error.issues[0]?.message ?? 'Add a short review note.', 'error'); return; }
    setReviewBusy(true);
    try { await createRecord('goalReviews', review); setReviewGoal(null); setReviewNote(''); notify('Goal review saved with its progress snapshot.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not save this review.', 'error'); }
    finally { setReviewBusy(false); }
  }

  return <div className="page">
    <PageHeading eyebrow="DIRECTION, HELD LIGHTLY" title="Goals" description="Keep the why in view. Let progress be measurable, not performative." action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> New goal</Button>} />
    <section className="goal-overview"><div className="goal-overview-copy"><span className="overview-icon blue"><Target size={18} /></span><div><span className="small-kicker">YOUR ACTIVE DIRECTIONS</span><strong>{workspace.goals.filter((goal) => goal.status === 'active').length} open goals</strong><small>Progress modes stay transparent.</small></div></div><div className="goal-overview-progress"><div><span>Average progress</span><b>{average}%</b></div><ProgressBar value={average} label="Average active goal progress" /></div><div className="goal-counts"><span><b>{workspace.goals.filter((goal) => goal.status === 'completed').length}</b> completed</span><span><b>{workspace.milestones.filter((milestone) => !milestone.completed).length}</b> milestones ahead</span></div></section>
    <div className="module-toolbar"><div className="filter-pills" role="tablist" aria-label="Goal views">{(['active', 'all', 'completed'] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? 'filter-pill selected' : 'filter-pill'} onClick={() => setFilter(value)}>{value === 'active' ? 'Active' : value === 'all' ? 'All open' : 'Completed'}<span>{workspace.goals.filter((goal) => value === 'active' ? goal.status === 'active' : value === 'all' ? goal.status !== 'archived' : goal.status === 'completed').length}</span></button>)}</div><span className="toolbar-note"><Flag size={14} /> Each goal chooses its own measure</span></div>
    {goals.length === 0 ? <div className="empty-module"><div className="empty-orbit"><Target size={25} /></div><p className="eyebrow">A NORTH STAR, NOT A SCOREBOARD</p><h2>{filter === 'completed' ? 'Your completed goals will live here.' : 'What would you like to make possible?'}</h2><p>Define a direction, then choose how you want to measure it.</p>{filter !== 'completed' && <Button onClick={() => setFormOpen(true)}><Plus size={16} /> Create a goal</Button>}</div> : <div className="goal-grid">{goals.map((goal, index) => {
      const progress = goalProgress(goal, workspace.milestones, workspace.tasks);
      const milestones = workspace.milestones.filter((item) => item.goalId === goal.id);
      const atRisk = goal.status === 'active' && Boolean(goal.targetDate && isPast(goal.targetDate) && progress < 100);
      const parent = workspace.goals.find((item) => item.id === goal.parentGoalId);
      const reviews = workspace.goalReviews.filter((review) => review.goalId === goal.id).sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)).slice(0, 2);
      return <article className={`goal-card ${goal.status === 'completed' ? 'goal-card-complete' : ''}`} key={goal.id} style={{ animationDelay: `${index * 45}ms` }}>
        <div className="goal-card-top"><span className="goal-symbol"><Target size={18} /></span><div className="goal-card-actions"><button type="button" className="icon-button tiny-icon" aria-label={`Edit ${goal.title}`} onClick={() => { setEditing(goal); setFormOpen(true); }}><Pencil size={14} /></button><button type="button" className="icon-button tiny-icon" aria-label={`Delete ${goal.title}`} onClick={() => setDeleteGoal(goal)}><Trash2 size={14} /></button></div></div>
        <div className="goal-tags"><Badge tone={goal.status === 'completed' ? 'green' : goal.priority === 'high' ? 'amber' : 'blue'}>{goal.status === 'completed' ? 'Complete' : goal.status}</Badge><span>{goal.category || 'Personal'}</span>{atRisk && <Badge tone="red">Past target</Badge>}</div>
        {parent && <p className="parent-goal"><GitBranch size={13} /> Part of {parent.title}</p>}
        <h3>{goal.title}</h3>{goal.description && <p className="goal-description">{goal.description}</p>}
        {goal.successCriteria && <div className="success-criteria"><span className="small-kicker">SUCCESS LOOKS LIKE</span><p>{goal.successCriteria}</p></div>}
        <div className="goal-progress-label"><span>{progressMethod(goal.progressMode)} progress</span><strong>{progress}%</strong></div><ProgressBar value={progress} label={`${goal.title} progress`} />
        <div className="goal-card-meta">{goal.targetDate && <span><CalendarDays size={13} /> Target {formatDate(goal.targetDate)}</span>}<span>{goal.horizon || 'Open horizon'}</span></div>
        {goal.status === 'active' && <button type="button" className="goal-review-action" onClick={() => { setReviewGoal(goal); setReviewNote(''); }}><History size={13} /> Log a progress review</button>}
        {reviews.length > 0 && <div className="goal-review-history"><span className="small-kicker">RECENT REVIEWS</span>{reviews.map((review) => <div key={review.id}><span>{formatDate(review.reviewedAt.slice(0, 10))} · {review.progress}%</span><p>{review.note}</p></div>)}</div>}
        <div className="milestone-block"><div className="milestone-heading"><span>Milestones <b>{milestones.filter((item) => item.completed).length}/{milestones.length}</b></span><button type="button" onClick={() => void addMilestone(goal)}><Plus size={13} /> Add</button></div>{milestones.length ? <div className="milestone-list">{milestones.slice(0, 3).map((item) => <button type="button" key={item.id} className={item.completed ? 'milestone-item milestone-done' : 'milestone-item'} onClick={() => void toggleMilestone(item)}><span>{item.completed ? <Check size={11} /> : <CircleDot size={11} />}</span>{item.title}{item.dueDate && <small>{formatDate(item.dueDate)}</small>}</button>)}</div> : <p className="no-milestones">Break the goal into one or two meaningful markers.</p>}</div>
        <div className="goal-card-footer"><span>{goal.habitIds.length + goal.taskIds.length + goal.roadmapNodeIds.length + goal.courseIds.length} linked items</span>{goal.status === 'active' ? <button type="button" className="complete-goal" onClick={() => void changeStatus(goal, 'completed')}>Mark complete <Check size={13} /></button> : goal.status === 'completed' ? <button type="button" className="complete-goal" onClick={() => void changeStatus(goal, 'active')}>Reopen <ArrowRight size={13} /></button> : <button type="button" className="complete-goal" onClick={() => void changeStatus(goal, 'active')}>Restore <ArrowRight size={13} /></button>}</div>
      </article>;
    })}</div>}
    <Modal open={formOpen} title={editing ? 'Refine this goal' : 'Name a direction'} description="Choose how you want to know you're moving." onClose={() => { setFormOpen(false); setEditing(null); }} size="lg"><GoalForm key={editing?.id ?? 'new-goal'} initial={editing} workspace={workspace} busy={busy} onCancel={() => { setFormOpen(false); setEditing(null); }} onSave={saveGoal} /></Modal>
    <Modal open={Boolean(deleteGoal)} title="Delete this goal?" description="A goal with linked items may need those items moved or unlinked first." onClose={() => setDeleteGoal(null)} size="sm"><div className="modal-body"><p className="modal-copy">Delete <strong>{deleteGoal?.title}</strong> and its milestones?</p><div className="form-actions"><Button variant="secondary" onClick={() => setDeleteGoal(null)}>Keep goal</Button><Button variant="danger" onClick={() => void confirmDelete()}>Delete goal</Button></div></div></Modal>
    <Modal open={Boolean(reviewGoal)} title="Pause and review" description="Capture what changed and keep a dated snapshot of this goal’s current progress." onClose={() => { setReviewGoal(null); setReviewNote(''); }} size="sm"><form className="modal-body form-stack" onSubmit={saveReview}><div className="review-progress-snapshot"><span>Progress today</span><strong>{reviewGoal ? goalProgress(reviewGoal, workspace.milestones, workspace.tasks) : 0}%</strong></div><TextAreaField label="Review note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={4} maxLength={2000} placeholder="What moved forward? What needs a different approach?" required autoFocus /><div className="form-actions"><Button variant="secondary" onClick={() => { setReviewGoal(null); setReviewNote(''); }}>Cancel</Button><Button type="submit" disabled={reviewBusy}>{reviewBusy ? 'Saving…' : 'Save review'}</Button></div></form></Modal>
  </div>;
}

function GoalForm({ initial, workspace, busy, onCancel, onSave }: { initial: Goal | null; workspace: ReturnType<typeof useWorkspace>['workspace']; busy: boolean; onCancel: () => void; onSave: (values: Omit<Goal, 'id' | 'createdAt'>) => Promise<void> }) {
  const [title, setTitle] = useState(initial?.title ?? ''); const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'Personal'); const [horizon, setHorizon] = useState(initial?.horizon ?? 'This year');
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayKey()); const [targetDate, setTargetDate] = useState(initial?.targetDate ?? '');
  const [status, setStatus] = useState<Goal['status']>(initial?.status ?? 'active'); const [priority, setPriority] = useState<Goal['priority']>(initial?.priority ?? 'medium');
  const [progressMode, setProgressMode] = useState<ProgressMode>(initial?.progressMode ?? 'manual'); const [manualProgress, setManualProgress] = useState(initial?.manualProgress ?? 0);
  const [successCriteria, setSuccessCriteria] = useState(initial?.successCriteria ?? ''); const [parentGoalId, setParentGoalId] = useState(initial?.parentGoalId ?? '');
  const [habitIds, setHabitIds] = useState<string[]>(initial?.habitIds ?? []); const [taskIds, setTaskIds] = useState<string[]>(initial?.taskIds ?? []);
  const [roadmapNodeIds, setRoadmapNodeIds] = useState<string[]>(initial?.roadmapNodeIds ?? []); const [courseIds, setCourseIds] = useState<string[]>(initial?.courseIds ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? ''); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    const goal = { title, description, category, horizon, startDate, targetDate, status, priority, progressMode, manualProgress, successCriteria, parentGoalId: parentGoalId || null, habitIds, taskIds, roadmapNodeIds, courseIds, notes };
    const parsed = goalInputSchema.safeParse({ ...goal, id: initial?.id ?? newId(), createdAt: initial?.createdAt ?? new Date().toISOString() });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the goal details.'); return; }
    setError(''); await onSave(goal);
  }
  function toggle(values: string[], setter: (next: string[]) => void, id: string) { setter(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]); }
  const parentOptions = workspace.goals.filter((goal) => goal.id !== initial?.id && goal.status !== 'archived' && (!initial || !hasGoalCycle(workspace.goals, initial.id, goal.id)));
  return <form className="modal-body form-stack" onSubmit={submit}>
    <Field label="Goal title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What do you want to make possible?" required maxLength={160} autoFocus />
    <TextAreaField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Why this matters to you" />
    <div className="form-grid"><Field label="Category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Health, learning…" /><Field label="Time horizon" value={horizon} onChange={(event) => setHorizon(event.target.value)} placeholder="This year" /></div>
    <div className="form-grid"><Field label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><Field label="Target date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></div>
    <div className="form-grid"><SelectField label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Goal['priority'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></SelectField><SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as Goal['status'])}><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option></SelectField></div>
    <SelectField label="Progress calculated from" value={progressMode} onChange={(event) => setProgressMode(event.target.value as ProgressMode)}><option value="manual">Manual estimate</option><option value="milestones">Completed milestones</option><option value="tasks">Completed linked tasks</option></SelectField>
    {progressMode === 'manual' && <label className="field"><span className="field-label">Current progress · {manualProgress}%</span><input aria-label="Manual goal progress" type="range" min={0} max={100} value={manualProgress} onChange={(event) => setManualProgress(Number(event.target.value))} className="range-input" /></label>}
    <TextAreaField label="Measurable success criteria" value={successCriteria} onChange={(event) => setSuccessCriteria(event.target.value)} rows={2} placeholder="How will you know this is complete?" />
    <SelectField label="Parent goal (optional)" value={parentGoalId} onChange={(event) => setParentGoalId(event.target.value)}><option value="">Top-level goal</option>{parentOptions.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</SelectField>
    <fieldset className="field fieldset"><legend className="field-label">Connect related work <small className="field-hint">Select records already in your workspace.</small></legend><RelationshipChecks label="Habits" values={workspace.habits.map((item) => ({ id: item.id, label: item.name }))} selected={habitIds} onToggle={(id) => toggle(habitIds, setHabitIds, id)} /><RelationshipChecks label="Tasks" values={workspace.tasks.map((item) => ({ id: item.id, label: item.title }))} selected={taskIds} onToggle={(id) => toggle(taskIds, setTaskIds, id)} /><RelationshipChecks label="Roadmap nodes" values={workspace.roadmapNodes.map((item) => ({ id: item.id, label: item.title }))} selected={roadmapNodeIds} onToggle={(id) => toggle(roadmapNodeIds, setRoadmapNodeIds, id)} /><RelationshipChecks label="Courses" values={workspace.courses.map((item) => ({ id: item.id, label: item.name }))} selected={courseIds} onToggle={(id) => toggle(courseIds, setCourseIds, id)} /></fieldset>
    <TextAreaField label="Notes and review" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="A thought to revisit later" />
    {error && <p role="alert" className="field-error form-error">{error}</p>}<div className="form-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save goal' : 'Create goal'}</Button></div>
  </form>;
}

function RelationshipChecks({ label, values, selected, onToggle }: { label: string; values: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  if (!values.length) return <div className="relationship-group"><span>{label}</span><small>Nothing here yet</small></div>;
  return <div className="relationship-group"><span>{label}</span><div>{values.slice(0, 8).map((item) => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} /><span>{item.label}</span></label>)}</div></div>;
}
function progressMethod(mode: ProgressMode) { return mode === 'manual' ? 'Manual' : mode === 'milestones' ? 'Milestone-derived' : 'Task-derived'; }
