import type { Goal, Habit, HabitLog, Lesson, LessonProgress, Milestone, RoadmapEdge, Task } from '../../shared/types';

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function scheduledOn(habit: Habit, date: Date): boolean {
  if (localDateKey(date) < habit.startDate) return false;
  if (habit.durationDays !== null) {
    const start = new Date(`${habit.startDate}T12:00:00`);
    start.setDate(start.getDate() + habit.durationDays);
    if (localDateKey(date) >= localDateKey(start)) return false;
  }
  const day = date.getDay();
  return habit.weekdays.length === 0 || habit.weekdays.includes(day);
}

export function habitCompletionPercent(habit: Habit, logs: HabitLog[], days = 7, now = new Date(), weekStartsOn = 1): number {
  const byDate = new Set(logs.filter((log) => log.habitId === habit.id && log.kind === 'complete').map((log) => log.date));
  const skipped = new Set(logs.filter((log) => log.habitId === habit.id && log.kind === 'skip').map((log) => log.date));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - ((today.getDay() - weekStartsOn + 7) % 7));
  const firstDate = days === 7 ? weekStart : new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
  if (habit.frequency === 'weekly') {
    const firstKey = localDateKey(firstDate);
    const todayKey = localDateKey(today);
    const completed = [...byDate].filter((dateKey) => dateKey >= firstKey && dateKey <= todayKey && !skipped.has(dateKey)).length;
    return habit.weeklyTarget <= 0 ? 0 : Math.min(100, Math.round((completed / habit.weeklyTarget) * 100));
  }
  let scheduled = 0;
  let complete = 0;
  for (const date = new Date(firstDate); date <= today; date.setDate(date.getDate() + 1)) {
    const dateKey = localDateKey(date);
    if (!scheduledOn(habit, date) || skipped.has(dateKey)) continue;
    scheduled += 1;
    if (byDate.has(dateKey)) complete += 1;
  }
  return scheduled === 0 ? 0 : Math.round((complete / scheduled) * 100);
}

export function reductionTargetPercent(habit: Habit, logs: HabitLog[], weekStartsOn = 1, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - ((today.getDay() - weekStartsOn + 7) % 7));
  const firstKey = localDateKey(start);
  const todayKey = localDateKey(today);
  const events = logs.filter((log) => log.habitId === habit.id && log.kind === 'avoid' && log.date >= firstKey && log.date <= todayKey);
  let target = habit.weeklyTarget;
  let progress = events.length;
  if (habit.frequency === 'daily') {
    const scheduledDates = new Set<string>();
    for (const date = new Date(start); date <= today; date.setDate(date.getDate() + 1)) {
      if (scheduledOn(habit, date)) scheduledDates.add(localDateKey(date));
    }
    target = scheduledDates.size;
    progress = new Set(events.map((event) => event.date)).size;
  }
  return target <= 0 ? 0 : Math.min(100, Math.round((progress / target) * 100));
}

export function habitCurrentStreak(habit: Habit, logs: HabitLog[], now = new Date(), eventKind: 'complete' | 'avoid' = 'complete'): number {
  const completed = new Set(logs.filter((log) => log.habitId === habit.id && log.kind === eventKind).map((log) => log.date));
  const skipped = new Set(logs.filter((log) => log.habitId === habit.id && log.kind === 'skip').map((log) => log.date));
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (localDateKey(cursor) < habit.startDate) return 0;
  if (scheduledOn(habit, cursor) && !completed.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  for (let checked = 0; checked < 400 && localDateKey(cursor) >= habit.startDate; checked += 1) {
    if (scheduledOn(habit, cursor)) {
      const dateKey = localDateKey(cursor);
      if (skipped.has(dateKey)) { cursor.setDate(cursor.getDate() - 1); continue; }
      if (!completed.has(dateKey)) break;
      streak += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function habitBestStreak(habit: Habit, logs: HabitLog[], eventKind: 'complete' | 'avoid' = 'complete'): number {
  const relevant = logs.filter((log) => log.habitId === habit.id && (log.kind === eventKind || log.kind === 'skip'));
  const completed = new Set(relevant.filter((log) => log.kind === eventKind).map((log) => log.date));
  const skipped = new Set(relevant.filter((log) => log.kind === 'skip').map((log) => log.date));
  const completedDates = [...completed].sort();
  if (!completedDates.length) return 0;
  const cursor = new Date(`${completedDates[0]}T12:00:00`);
  const last = completedDates[completedDates.length - 1];
  let streak = 0;
  let best = 0;
  for (let checked = 0; checked < 5000 && localDateKey(cursor) <= last; checked += 1) {
    const dateKey = localDateKey(cursor);
    if (scheduledOn(habit, cursor) && !skipped.has(dateKey)) {
      if (completed.has(dateKey)) { streak += 1; best = Math.max(best, streak); }
      else streak = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

export function reductionAvoidanceDays(habit: Habit, logs: HabitLog[], days = 7, now = new Date()): number {
  const firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const firstKey = localDateKey(firstDay);
  const lastKey = localDateKey(now);
  return new Set(logs.filter((log) => log.habitId === habit.id && log.kind === 'avoid' && log.date >= firstKey && log.date <= lastKey).map((log) => log.date)).size;
}

export function taskStatusTransition(task: Task, done: boolean, now = new Date()): Task {
  return { ...task, status: done ? 'done' : 'todo', completedAt: done ? localDateKey(now) : null };
}

export function nextRecurrenceDate(task: Task): string | null {
  if (task.recurrence === 'none' || !task.dueDate) return null;
  const date = new Date(`${task.dueDate}T12:00:00`);
  if (task.recurrence === 'daily') date.setDate(date.getDate() + 1);
  if (task.recurrence === 'weekly') date.setDate(date.getDate() + 7);
  if (task.recurrence === 'monthly') {
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(originalDay, lastDay));
  }
  return localDateKey(date);
}

export function goalProgress(goal: Goal, milestones: Milestone[], tasks: Task[]): number {
  if (goal.progressMode === 'manual') return Math.max(0, Math.min(100, Math.round(goal.manualProgress)));
  if (goal.progressMode === 'milestones') {
    const items = milestones.filter((milestone) => milestone.goalId === goal.id);
    return items.length === 0 ? 0 : Math.round((items.filter((item) => item.completed).length / items.length) * 100);
  }
  const taskIds = new Set([...goal.taskIds, ...tasks.filter((task) => task.goalId === goal.id).map((task) => task.id)]);
  const related = tasks.filter((task) => taskIds.has(task.id));
  return related.length === 0 ? 0 : Math.round((related.filter((task) => task.status === 'done').length / related.length) * 100);
}

export function hasGoalCycle(goals: Goal[], goalId: string, candidateParentId: string | null): boolean {
  const visited = new Set<string>();
  let currentId = candidateParentId;
  while (currentId) {
    if (currentId === goalId || visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = goals.find((goal) => goal.id === currentId)?.parentGoalId ?? null;
  }
  return false;
}

export function hasRoadmapTreeCycle(nodes: Pick<import('../../shared/types').RoadmapNode, 'id' | 'parentId'>[], nodeId: string, candidateParentId: string | null): boolean {
  const visited = new Set<string>();
  let currentId = candidateParentId;
  while (currentId) {
    if (currentId === nodeId || visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = nodes.find((node) => node.id === currentId)?.parentId ?? null;
  }
  return false;
}

export function courseProgress(lessons: Lesson[], progress: LessonProgress[], mode: 'lessons' | 'weighted' = 'lessons'): number {
  if (lessons.length === 0) return 0;
  const completed = new Set(progress.filter((item) => item.completed).map((item) => item.lessonId));
  if (mode === 'weighted') {
    const totalWeight = lessons.reduce((sum, lesson) => sum + Math.max(0, lesson.weight || 0), 0);
    if (totalWeight === 0) return 0;
    const completedWeight = lessons.filter((lesson) => completed.has(lesson.id)).reduce((sum, lesson) => sum + Math.max(0, lesson.weight || 0), 0);
    return Math.round((completedWeight / totalWeight) * 100);
  }
  return Math.round((lessons.filter((lesson) => completed.has(lesson.id)).length / lessons.length) * 100);
}

export function hasRoadmapCycle(edges: RoadmapEdge[], candidateSource: string, candidateTarget: string, kind: 'dependency' | 'tree' = 'dependency'): boolean {
  if (candidateSource === candidateTarget) return true;
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.kind !== kind) continue;
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
  }
  const stack = [candidateTarget];
  const visited = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === candidateSource) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }
  return false;
}

export function weeklyCompletion(habits: Habit[], logs: HabitLog[], tasks: Task[], now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    const key = localDateKey(date);
    const dueHabits = habits.filter((habit) => scheduledOn(habit, date) && !logs.some((log) => log.habitId === habit.id && log.date === key && log.kind === 'skip'));
    const habitDone = dueHabits.filter((habit) => logs.some((log) => log.habitId === habit.id && log.date === key && (log.kind === 'complete' || (habit.kind === 'reduction' && log.kind === 'avoid')))).length;
    const dueTasks = tasks.filter((task) => task.dueDate === key);
    const taskDone = dueTasks.filter((task) => task.status === 'done' && task.completedAt === key).length;
    return { day: date.toLocaleDateString(undefined, { weekday: 'short' }), date: key, habits: dueHabits.length ? habitDone / dueHabits.length : null, tasks: dueTasks.length ? taskDone / dueTasks.length : null, activity: habitDone + taskDone };
  });
}
