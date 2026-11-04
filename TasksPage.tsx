import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDownUp, CalendarDays, Check, ClipboardList, Clock3, FolderTree, LayoutGrid, List, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { Goal, Task, TaskStatus } from '../../../shared/types';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useToast } from '../../components/Feedback';
import { Badge, Button, Field, Modal, PageHeading, SelectField, TextAreaField } from '../../components/ui';
import { formatDate, isPast, newId, todayKey } from '../../lib/format';
import { taskInputSchema } from '../../lib/validation';
import { useTaskActions } from './useTaskActions';

const filters = ['All', 'Today', 'Upcoming', 'Overdue', 'Completed'] as const;
type TaskFilter = typeof filters[number];

export function TasksPage() {
  const { workspace, createRecord, updateRecord, deleteRecord } = useWorkspace();
  const { notify } = useToast();
  const { completeTask, reopenTask } = useTaskActions();
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'list' | 'board' | 'category'>('list');
  const [sortPriority, setSortPriority] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [removeTask, setRemoveTask] = useState<Task | null>(null);
  const [subtaskFor, setSubtaskFor] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const today = todayKey();
  const categories = [...new Set(workspace.tasks.map((task) => task.category.trim() || '__uncategorized'))].sort();
  const counts = useMemo(() => ({
    All: workspace.tasks.length,
    Today: workspace.tasks.filter((task) => task.dueDate === today && task.status !== 'done').length,
    Upcoming: workspace.tasks.filter((task) => task.dueDate > today && task.status !== 'done').length,
    Overdue: workspace.tasks.filter((task) => task.dueDate && task.dueDate < today && task.status !== 'done').length,
    Completed: workspace.tasks.filter((task) => task.status === 'done').length,
  }), [workspace.tasks, today]);
  const visible = workspace.tasks.filter((task) => {
    const matchFilter = filter === 'All' || (filter === 'Today' && task.dueDate === today && task.status !== 'done') || (filter === 'Upcoming' && task.dueDate > today && task.status !== 'done') || (filter === 'Overdue' && Boolean(task.dueDate && task.dueDate < today && task.status !== 'done')) || (filter === 'Completed' && task.status === 'done');
    const matchQuery = !query || `${task.title} ${task.description} ${task.category} ${task.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const matchPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchCategory = categoryFilter === 'all' || (task.category.trim() || '__uncategorized') === categoryFilter;
    return matchFilter && matchQuery && matchPriority && matchCategory;
  }).sort((a, b) => sortPriority ? priorityRank(b.priority) - priorityRank(a.priority) || a.dueDate.localeCompare(b.dueDate) : a.dueDate.localeCompare(b.dueDate) || priorityRank(b.priority) - priorityRank(a.priority));

  async function saveTask(values: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) {
    const record: Task = { ...values, id: editing?.id ?? newId(), createdAt: editing?.createdAt ?? new Date().toISOString(), completedAt: editing?.completedAt ?? null };
    const parsed = taskInputSchema.safeParse(record);
    if (!parsed.success) { notify(parsed.error.issues[0]?.message ?? 'Check the task details.', 'error'); return; }
    try {
      if (editing) await updateRecord('tasks', record, editing.id);
      else await createRecord('tasks', record);
      setFormOpen(false); setEditing(null); notify(editing ? 'Task updated.' : 'Task added to your list.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not save this task.', 'error'); }
  }

  async function addSubtask(taskId: string) {
    const title = subtaskTitle.trim();
    if (!title) return;
    try { await createRecord('subtasks', { id: newId(), taskId, title, completed: false }); setSubtaskTitle(''); setSubtaskFor(null); notify('Step added.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not add this step.', 'error'); }
  }
  async function toggleSubtask(id: string, taskId: string, title: string, completed: boolean) {
    try { await updateRecord('subtasks', { id, taskId, title, completed: !completed }, id); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not update this step.', 'error'); }
  }
  async function confirmDelete() {
    if (!removeTask) return;
    try { await deleteRecord('tasks', removeTask.id); setRemoveTask(null); notify('Task removed.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not remove this task. Unlink it from related roadmap nodes first.', 'error'); }
  }

  return <div className="page">
    <PageHeading eyebrow="A CLEAR PLACE TO BEGIN" title="Tasks" description="Turn intentions into next actions. Keep the list honest and doable." action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> Add task</Button>} />
    <div className="task-command-row"><div className="filter-pills task-filters" role="tablist" aria-label="Task views">{filters.map((item) => <button type="button" role="tab" aria-selected={filter === item} className={filter === item ? 'filter-pill selected' : 'filter-pill'} key={item} onClick={() => setFilter(item)}>{item}<span>{counts[item]}</span></button>)}</div><div className="task-tools"><label className="search-wrap"><Search size={15} /><input aria-label="Search tasks" placeholder="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} /></label><SelectField label="Priority" aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}><option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></SelectField><SelectField label="Category" aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category === '__uncategorized' ? 'Uncategorized' : category}</option>)}</SelectField><Button variant="quiet" size="sm" onClick={() => setSortPriority((value) => !value)} aria-label="Toggle task sort"><ArrowDownUp size={15} /><span>{sortPriority ? 'Priority' : 'Deadline'}</span></Button><div className="view-toggle"><button type="button" aria-label="List view" aria-pressed={view === 'list'} className={view === 'list' ? 'view-selected' : ''} onClick={() => setView('list')}><List size={16} /></button><button type="button" aria-label="Group by category" aria-pressed={view === 'category'} className={view === 'category' ? 'view-selected' : ''} onClick={() => setView('category')}><FolderTree size={16} /></button><button type="button" aria-label="Board view" aria-pressed={view === 'board'} className={view === 'board' ? 'view-selected' : ''} onClick={() => setView('board')}><LayoutGrid size={16} /></button></div></div></div>
    <div className="task-list-heading"><div><span className="small-kicker">{filter.toUpperCase()} / {visible.length} ITEMS</span><h2>{filter === 'All' ? 'The task desk' : `${filter} tasks`}</h2></div><span className="task-heading-date"><CalendarDays size={14} /> {new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(new Date())}</span></div>
    {visible.length === 0 ? <div className="empty-module empty-task"><div className="empty-orbit"><ClipboardList size={26} /></div><p className="eyebrow">CLEAR SPACE, CLEAR MIND</p><h2>{query ? 'Nothing matched that search.' : filter === 'Overdue' ? 'Nothing is overdue.' : 'A little less on your mind.'}</h2><p>{query ? 'Try another title, tag, or category.' : 'Add a task when you know what the next step is.'}</p>{filter === 'All' && <Button onClick={() => setFormOpen(true)}><Plus size={16} /> Add your first task</Button>}</div> : view === 'list' ? <div className="task-list">{visible.map((task, index) => {
      const subtasks = workspace.subtasks.filter((subtask) => subtask.taskId === task.id);
      const doneSubtasks = subtasks.filter((subtask) => subtask.completed).length;
      const goal = workspace.goals.find((item) => item.id === task.goalId);
      const overdue = task.status !== 'done' && isPast(task.dueDate);
      return <article className={`task-row ${task.status === 'done' ? 'task-row-done' : ''}`} key={task.id} style={{ animationDelay: `${index * 35}ms` }}>
        <button className={`task-check ${task.status === 'done' ? 'task-check-done' : ''}`} type="button" aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`} onClick={() => task.status === 'done' ? void reopenTask(task) : void completeTask(task)}>{task.status === 'done' ? <Check size={15} /> : <span />}</button>
        <div className="task-main"><div className="task-title-line"><h3>{task.title}</h3>{overdue && <Badge tone="red">Overdue</Badge>}{task.priority === 'high' && task.status !== 'done' && <Badge tone="amber">High priority</Badge>}</div>{task.description && <p>{task.description}</p>}<div className="task-meta">{task.dueDate && <span className={overdue ? 'meta-overdue' : ''}><CalendarDays size={13} /> {formatDate(task.dueDate)}</span>}{task.category && <span>{task.category}</span>}{task.estimateMinutes && <span><Clock3 size={13} /> {task.estimateMinutes} min</span>}{goal && <span className="meta-goal"><TargetIcon /> {goal.title}</span>}{task.recurrence !== 'none' && <span className="meta-repeat">↻ {task.recurrence}</span>}</div>
          {!!task.tags.length && <div className="tag-row">{task.tags.map((tag) => <span className="task-tag" key={tag}>{tag}</span>)}</div>}
          {subtasks.length > 0 && <div className="subtask-list">{subtasks.map((subtask) => <label key={subtask.id} className={subtask.completed ? 'subtask subtask-done' : 'subtask'}><input type="checkbox" checked={subtask.completed} onChange={() => void toggleSubtask(subtask.id, task.id, subtask.title, subtask.completed)} /><span>{subtask.title}</span></label>)}<small>{doneSubtasks} of {subtasks.length} steps</small></div>}
          {subtaskFor === task.id ? <form className="subtask-add" onSubmit={(event) => { event.preventDefault(); void addSubtask(task.id); }}><input autoFocus aria-label="Subtask title" value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="A smaller next step" /><button type="submit" aria-label="Save subtask"><Check size={15} /></button><button type="button" aria-label="Cancel adding subtask" onClick={() => setSubtaskFor(null)}>×</button></form> : <button type="button" className="add-subtask-link" onClick={() => { setSubtaskFor(task.id); setSubtaskTitle(''); }}><Plus size={12} /> Add a step</button>}
        </div>
        <div className="task-row-actions"><Badge tone={task.status === 'done' ? 'green' : task.status === 'in_progress' ? 'blue' : 'neutral'}>{task.status === 'in_progress' ? 'In progress' : task.status === 'done' ? 'Complete' : task.priority}</Badge><button type="button" className="icon-button tiny-icon" aria-label={`Edit ${task.title}`} onClick={() => { setEditing(task); setFormOpen(true); }}><Pencil size={14} /></button><button type="button" className="icon-button tiny-icon" aria-label={`Delete ${task.title}`} onClick={() => setRemoveTask(task)}><Trash2 size={14} /></button></div>
      </article>;
    })}</div> : view === 'category' ? <div className="task-category-groups">{[...new Set(visible.map((task) => task.category.trim() || '__uncategorized'))].sort().map((category) => { const group = visible.filter((task) => (task.category.trim() || '__uncategorized') === category); return <section className="task-category-group" key={category}><header><span>{category === '__uncategorized' ? 'Uncategorized' : category}</span><b>{group.length}</b></header><div className="task-category-list">{group.map((task) => { const overdue = task.status !== 'done' && isPast(task.dueDate); return <article className={`task-category-row ${task.status === 'done' ? 'task-row-done' : ''}`} key={task.id}><button className={`task-check ${task.status === 'done' ? 'task-check-done' : ''}`} type="button" aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`} onClick={() => task.status === 'done' ? void reopenTask(task) : void completeTask(task)}>{task.status === 'done' ? <Check size={14} /> : <span />}</button><div className="task-category-copy"><strong>{task.title}</strong><small>{overdue ? `Overdue · ${formatDate(task.dueDate)}` : task.dueDate ? formatDate(task.dueDate) : task.status === 'in_progress' ? 'In progress' : 'No due date'}</small></div><Badge tone={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'neutral'}>{task.priority}</Badge><div className="task-row-actions"><button type="button" className="icon-button tiny-icon" aria-label={`Edit ${task.title}`} onClick={() => { setEditing(task); setFormOpen(true); }}><Pencil size={14} /></button><button type="button" className="icon-button tiny-icon" aria-label={`Delete ${task.title}`} onClick={() => setRemoveTask(task)}><Trash2 size={14} /></button></div></article>; })}</div></section>; })}</div> : <div className="task-board">{(['todo', 'in_progress', 'done'] as TaskStatus[]).map((status) => <section className="board-column" key={status}><header><span>{status === 'todo' ? 'To do' : status === 'in_progress' ? 'In progress' : 'Completed'}</span><b>{visible.filter((task) => task.status === status).length}</b></header>{visible.filter((task) => task.status === status).map((task) => <div className="board-task" key={task.id}><span className={`board-priority priority-${task.priority}`} /><strong>{task.title}</strong>{task.dueDate && <small>{formatDate(task.dueDate)}</small>}<button type="button" className="add-subtask-link" onClick={() => task.status === 'done' ? void reopenTask(task) : void completeTask(task)}>{task.status === 'done' ? 'Reopen' : 'Complete'} <Check size={13} /></button></div>)}</section>)}</div>}
    <Modal open={formOpen} title={editing ? 'Edit task' : 'Add a next step'} description="A task should be clear enough to start." onClose={() => { setFormOpen(false); setEditing(null); }} size="lg"><TaskForm key={editing?.id ?? 'new-task'} initial={editing} goals={workspace.goals} onCancel={() => { setFormOpen(false); setEditing(null); }} onSave={saveTask} /></Modal>
    <Modal open={Boolean(removeTask)} title="Delete this task?" description="Its subtasks will be removed too. This can’t be undone." onClose={() => setRemoveTask(null)} size="sm"><div className="modal-body"><p className="modal-copy">Remove <strong>{removeTask?.title}</strong> from your task desk?</p><div className="form-actions"><Button variant="secondary" onClick={() => setRemoveTask(null)}>Keep task</Button><Button variant="danger" onClick={() => void confirmDelete()}>Delete task</Button></div></div></Modal>
  </div>;
}

function TaskForm({ initial, goals, onCancel, onSave }: { initial: Task | null; goals: Goal[]; onCancel: () => void; onSave: (values: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => Promise<void> }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [priority, setPriority] = useState<Task['priority']>(initial?.priority ?? 'medium');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'todo');
  const [category, setCategory] = useState(initial?.category ?? 'Personal');
  const [estimateMinutes, setEstimateMinutes] = useState<number | null>(initial?.estimateMinutes ?? null);
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [recurrence, setRecurrence] = useState<Task['recurrence']>(initial?.recurrence ?? 'none');
  const [goalId, setGoalId] = useState(initial?.goalId ?? '');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    const values = { title, description, dueDate, startDate, priority, status, category, estimateMinutes, tags: tags.split(',').map((item) => item.trim()).filter(Boolean), recurrence, goalId: goalId || null };
    const parsed = taskInputSchema.safeParse({ ...values, id: initial?.id ?? newId(), createdAt: initial?.createdAt ?? new Date().toISOString(), completedAt: initial?.completedAt ?? null });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the task details.'); return; }
    setError(''); await onSave(values);
  }
  return <form className="modal-body form-stack" onSubmit={submit}><Field label="Task title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What’s the next action?" maxLength={160} required autoFocus /><TextAreaField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Helpful context" />
    <div className="form-grid"><Field label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><Field label="Start date (optional)" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
    <div className="form-grid"><SelectField label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></SelectField><SelectField label="Status" value={status} disabled={initial?.status === 'done'} onChange={(event) => setStatus(event.target.value as TaskStatus)}><option value="todo">To do</option><option value="in_progress">In progress</option>{initial?.status === 'done' && <option value="done">Completed — reopen from the task list</option>}</SelectField></div>
    <div className="form-grid"><Field label="Category / project" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Personal" /><Field label="Estimate in minutes" type="number" min={1} value={estimateMinutes ?? ''} onChange={(event) => setEstimateMinutes(event.target.value ? Number(event.target.value) : null)} placeholder="Optional" /></div>
    <Field label="Tags (comma-separated)" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="work, focus" />
    <div className="form-grid"><SelectField label="Repeat" value={recurrence} onChange={(event) => setRecurrence(event.target.value as Task['recurrence'])}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></SelectField><SelectField label="Link to goal" value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">No linked goal</option>{goals.filter((goal) => goal.status === 'active').map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</SelectField></div>
    {error && <p className="field-error form-error" role="alert">{error}</p>}<div className="form-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit">{initial ? 'Save task' : 'Add task'}</Button></div>
  </form>;
}
function priorityRank(value: Task['priority']) { return value === 'high' ? 3 : value === 'medium' ? 2 : 1; }
function TargetIcon() { return <span className="target-dot" aria-hidden="true">◎</span>; }
