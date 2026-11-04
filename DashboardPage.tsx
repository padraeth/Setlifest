import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Circle, Compass, GraduationCap, ListTodo, Sparkles, Target } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import type { Habit, Task } from '../../../shared/types';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useToast } from '../../components/Feedback';
import { Badge, Button, Card, ProgressBar } from '../../components/ui';
import { courseProgress, goalProgress, habitCurrentStreak, scheduledOn, weeklyCompletion } from '../../lib/calculations';
import { formatDate, greetingName, newId, todayKey } from '../../lib/format';
import { useTaskActions } from '../tasks/useTaskActions';

const dateLine = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

export function DashboardPage() {
  const { auth, workspace, createRecord, deleteRecord } = useWorkspace();
  const { notify } = useToast();
  const { completeTask } = useTaskActions();
  const today = todayKey();
  const selectedWidgets = new Set(workspace.preferences.dashboardWidgets);
  const todayHabits = workspace.habits.filter((habit) => habit.startDate <= today && scheduledOn(habit, new Date()));
  const completedToday = todayHabits.filter((habit) => habit.kind === 'positive'
    ? workspace.habitLogs.some((log) => log.habitId === habit.id && log.date === today && log.kind === 'complete')
    : workspace.habitLogs.some((log) => log.habitId === habit.id && log.date === today && log.kind === 'avoid'));
  const todayTasks = workspace.tasks.filter((task) => task.status !== 'done' && (!task.dueDate || task.dueDate <= today))
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 4);
  const todayTaskRecords = workspace.tasks.filter((task) => task.dueDate === today || task.completedAt === today);
  const completedTodayTasks = todayTaskRecords.filter((task) => task.status === 'done' && task.completedAt === today);
  const activeGoals = workspace.goals.filter((goal) => goal.status === 'active');
  const activeCourses = workspace.courses.filter((course) => course.status === 'active').slice(0, 2);
  const weekly = useMemo(() => weeklyCompletion(workspace.habits, workspace.habitLogs, workspace.tasks), [workspace.habits, workspace.habitLogs, workspace.tasks]);
  const hasActivity = weekly.some((day) => day.activity > 0);
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  async function markHabit(habit: Habit) {
    const existing = workspace.habitLogs.find((log) => log.habitId === habit.id && log.date === today && log.kind === 'complete');
    try {
      if (existing) await deleteRecord('habitLogs', existing.id);
      else await createRecord('habitLogs', { id: newId(), habitId: habit.id, date: today, kind: 'complete', note: '', createdAt: new Date().toISOString() });
      notify(existing ? 'Habit reopened for today.' : 'A small step, kept.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not update this habit.', 'error'); }
  }

  async function logAvoidance(habit: Habit) {
    try {
      await createRecord('habitLogs', { id: newId(), habitId: habit.id, date: today, kind: 'avoid', note: '', createdAt: new Date().toISOString() });
      notify('A moment of choice, recorded.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not record this moment.', 'error'); }
  }

  return <div className="page page-dashboard">
    <motion.section className="dashboard-hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0}} transition={{ duration: 0.45 }}>
      <div className="hero-copy"><span className="hero-overline"><span className="live-pulse" /> YOUR DAY, IN VIEW</span><p className="hero-date">{dateLine}</p><h1>{timeGreeting},<br /><em>{greetingName(workspace.preferences.displayName.trim() || auth.user?.name || 'there')}.</em></h1><p className="hero-subtitle">Make room for what matters.<br />The rest can wait its turn.</p><div className="hero-actions"><Button onClick={() => document.getElementById('today-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Open today’s plan <ArrowRight size={16} /></Button><span className="hero-footnote"><Compass size={14} /> One intentional step is enough.</span></div></div>
      <div className="hero-visual" aria-hidden="true"><div className="hero-grid" /><div className="hero-orbital orbital-large" /><div className="hero-orbital orbital-small" /><div className="hero-sphere"><span className="sphere-shine" /><span className="sphere-contour" /><span className="sphere-dot" /></div><span className="hero-float-label">YOUR OWN<br />RHYTHM</span><span className="hero-micro-label">01 / TODAY</span></div>
      <div className="hero-index">S / 01</div>
    </motion.section>

    <section className="stat-strip" aria-label="Today's progress">
      <StatCard icon={<Sparkles size={17} />} label="Habits today" value={`${completedToday.length}/${todayHabits.length}`} hint="small promises kept" tone="blue" />
      <StatCard icon={<ListTodo size={17} />} label="Tasks today" value={`${completedTodayTasks.length}/${todayTaskRecords.length}`} hint="due or completed today" tone="cream" />
      <StatCard icon={<Target size={17} />} label="Active goals" value={String(activeGoals.length)} hint="directions you chose" tone="white" />
      <StatCard icon={<GraduationCap size={17} />} label="Learning" value={`${workspace.courses.filter((course) => course.status === 'active').length}`} hint="courses in motion" tone="navy" />
    </section>

    <div className="dashboard-grid">
      <section className="section-stack" id="today-plan">
        {(selectedWidgets.has('habits') || selectedWidgets.has('tasks')) && <div className="section-title-row"><div><p className="eyebrow">THE NEXT FEW HOURS</p><h2>Today’s plan</h2></div><Link className="text-link" to={selectedWidgets.has('tasks') ? '/tasks' : '/habits'}>{selectedWidgets.has('tasks') ? 'View all tasks' : 'View habits'} <ArrowUpRight size={14} /></Link></div>}
        {selectedWidgets.has('habits') && <Card className="today-card">
          <div className="today-card-head"><div><span className="small-kicker">YOUR RHYTHM</span><h3>Habits to return to</h3></div><Link to="/habits" className="round-link" aria-label="Open habits"><ArrowUpRight size={16} /></Link></div>
          {todayHabits.length ? <div className="today-habit-list">{todayHabits.slice(0, 4).map((habit) => {
            const log = workspace.habitLogs.find((entry) => entry.habitId === habit.id && entry.date === today && (entry.kind === 'complete' || entry.kind === 'avoid'));
            return <div className={`today-habit-row ${log ? 'row-done' : ''}`} key={habit.id}>
              <button className={`habit-check ${log ? 'habit-check-on' : ''}`} type="button" aria-label={log ? `Undo ${habit.name}` : `Mark ${habit.name} complete`} onClick={() => habit.kind === 'positive' ? void markHabit(habit) : void logAvoidance(habit)}>{log ? <Check size={14} /> : <span />}</button>
              <span className="habit-color-dot" style={{ backgroundColor: habit.accent }} />
              <div className="today-habit-copy"><strong>{habit.name}</strong><small>{habit.kind === 'reduction' ? 'A choice, not a streak.' : `${habitCurrentStreak(habit, workspace.habitLogs)} day rhythm`}</small></div>
              <span className="habit-row-action">{log ? <Badge tone="green">Recorded</Badge> : habit.kind === 'reduction' ? 'Log a win' : 'Mark done'}</span>
            </div>;
          })}</div> : <div className="mini-empty"><Sparkles size={18} /><span>Your daily rhythm starts with one small habit.</span><Link to="/habits">Create a habit <ArrowRight size={13} /></Link></div>}
          <div className="today-card-foot"><span>{completedToday.length} of {todayHabits.length} scheduled today</span><div className="mini-progress"><span style={{ width: `${todayHabits.length ? completedToday.length / todayHabits.length * 100 : 0}%` }} /></div></div>
        </Card>}

        {selectedWidgets.has('tasks') && <Card className="tasks-card">
          <div className="today-card-head"><div><span className="small-kicker">FOCUS, NOT FRENZY</span><h3>Priority tasks</h3></div><Link to="/tasks" className="round-link" aria-label="Open task list"><ArrowUpRight size={16} /></Link></div>
          {todayTasks.length ? <div className="priority-task-list">{todayTasks.map((task) => <button key={task.id} className="priority-task-row" onClick={() => void completeTask(task)} type="button"><span className="task-unchecked"><Circle size={18} /></span><span className="task-title-wrap"><strong>{task.title}</strong><small>{task.dueDate ? (task.dueDate < today ? `Overdue · ${formatDate(task.dueDate)}` : formatDate(task.dueDate)) : task.category || 'No due date'}</small></span><Badge tone={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'neutral'}>{task.priority}</Badge></button>)}</div> : <div className="mini-empty"><ListTodo size={18} /><span>No tasks need your attention right now.</span><Link to="/tasks">Plan a next step <ArrowRight size={13} /></Link></div>}
          <div className="card-footer-link"><Link to="/tasks">Open task desk <ArrowRight size={13} /></Link></div>
        </Card>}
        {!selectedWidgets.has('habits') && !selectedWidgets.has('tasks') && <Card className="today-card"><div className="mini-empty"><Compass size={18} /><span>Your daily widgets are hidden.</span><Link to="/settings">Choose what appears <ArrowRight size={13} /></Link></div></Card>}
      </section>

      <section className="section-stack dashboard-side">
        <div className="section-title-row"><div><p className="eyebrow">A LITTLE CONTEXT</p><h2>Your week</h2></div><span className="week-range">Last 7 days</span></div>
        <Card className="chart-card"><div className="chart-topline"><div><span className="chart-main-value">{weekly.reduce((sum, day) => sum + day.activity, 0)}</span><span className="chart-main-label"> logged moments</span></div><span className="chart-symbol"><ArrowUpRight size={16} /></span></div>
          {hasActivity ? <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weekly} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="habitArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3168f5" stopOpacity={0.22} /><stop offset="100%" stopColor="#3168f5" stopOpacity={0} /></linearGradient><linearGradient id="taskArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d8a953" stopOpacity={0.2} /><stop offset="100%" stopColor="#d8a953" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 6" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><YAxis domain={[0, 1]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 9 }} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)', fontSize: 12 }} formatter={(value) => `${Math.round(Number(value) * 100)}%`} /><Area type="monotone" dataKey="habits" name="Habit completion" stroke="#3168f5" strokeWidth={2.5} fill="url(#habitArea)" /><Area type="monotone" dataKey="tasks" name="Due task completion" stroke="#c8984a" strokeWidth={2} fill="url(#taskArea)" /></AreaChart></ResponsiveContainer></div> : <div className="chart-empty"><span className="chart-empty-ring"><Sparkles size={17} /></span><p>Your real activity will take shape here.</p></div>}
          <div className="chart-legend"><span><i className="legend-blue" />Habits</span><span><i className="legend-gold" />Due tasks</span></div>
        </Card>

        {selectedWidgets.has('goals') && <Card className="goal-glance-card"><div className="today-card-head"><div><span className="small-kicker">FARTHER AHEAD</span><h3>Active goals</h3></div><Link to="/goals" className="round-link" aria-label="Open goals"><ArrowUpRight size={16} /></Link></div>
          {activeGoals.length ? <div className="glance-list">{activeGoals.slice(0, 3).map((goal) => { const progress = goalProgress(goal, workspace.milestones, workspace.tasks); return <Link to="/goals" className="goal-glance-row" key={goal.id}><span className="goal-mini-icon"><Target size={15} /></span><div className="goal-glance-copy"><span>{goal.title}</span><ProgressBar value={progress} label={`${goal.title} progress`} /></div><b>{progress}%</b></Link>; })}</div> : <div className="mini-empty mini-empty-tight"><Target size={17} /><span>No active goals yet.</span><Link to="/goals">Set a direction <ArrowRight size={13} /></Link></div>}
        </Card>}

        {selectedWidgets.has('learning') && <Card className="learning-glance-card"><div className="today-card-head"><div><span className="small-kicker">KEEP CURIOUS</span><h3>Learning in progress</h3></div><Link to="/courses" className="round-link" aria-label="Open courses"><ArrowUpRight size={16} /></Link></div>
          {activeCourses.length ? activeCourses.map((course) => { const sections = workspace.courseSections.filter((section) => section.courseId === course.id); const lessons = workspace.lessons.filter((lesson) => sections.some((section) => section.id === lesson.sectionId)); const progress = courseProgress(lessons, workspace.lessonProgress, course.progressMode); return <Link key={course.id} to={`/courses/${course.id}`} className="learning-row"><span className="learning-cover"><GraduationCap size={17} /></span><span className="learning-copy"><strong>{course.name}</strong><small>{progress}% completed</small></span><ProgressBar value={progress} label={`${course.name} progress`} /></Link>; }) : <div className="mini-empty mini-empty-tight"><GraduationCap size={17} /><span>Nothing in your learning queue.</span><Link to="/courses">Add a course <ArrowRight size={13} /></Link></div>}
        </Card>}
      </section>
    </div>
    <footer className="dashboard-footer"><span>Setlifest / A practice in becoming</span><span>Today is a place to begin again.</span></footer>
  </div>;
}

function priorityWeight(priority: Task['priority']) { return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1; }
function StatCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: string }) {
  return <div className={`stat-card stat-${tone}`}><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}
