import { describe, expect, it } from 'vitest';
import type { Goal, Habit, HabitLog, Lesson, LessonProgress, Milestone, RoadmapEdge, Task } from '../shared/types';
import {
  courseProgress,
  goalProgress,
  hasGoalCycle,
  habitBestStreak,
  habitCompletionPercent,
  habitCurrentStreak,
  hasRoadmapCycle,
  hasRoadmapTreeCycle,
  nextRecurrenceDate,
  reductionTargetPercent,
  scheduledOn,
  taskStatusTransition,
  weeklyCompletion,
} from '../src/lib/calculations';
import { recurringTaskId } from '../src/lib/format';

const habit: Habit = {
  id: 'habit-1', name: 'Read', description: '', category: 'Personal', kind: 'positive', icon: 'book',
  frequency: 'daily', weekdays: [1, 3, 5], weeklyTarget: 3, reminderTime: '', startDate: '2026-01-05',
  durationDays: null, accent: '#3168F5', createdAt: '2026-01-05T09:00:00.000Z',
};
const task: Task = {
  id: 'task-1', title: 'Plan', description: '', dueDate: '2026-01-31', startDate: '', priority: 'medium',
  status: 'todo', category: 'Personal', estimateMinutes: null, tags: [], recurrence: 'monthly', goalId: null,
  createdAt: '2026-01-01T12:00:00.000Z', completedAt: null,
};
function log(date: string, kind: HabitLog['kind'] = 'complete', id = date): HabitLog {
  return { id, habitId: habit.id, date, kind, note: '', createdAt: `${date}T12:00:00.000Z` };
}

describe('habit schedule and progress', () => {
  it('honors start date and selected weekdays', () => {
    expect(scheduledOn(habit, new Date(2026, 0, 4, 12))).toBe(false);
    expect(scheduledOn(habit, new Date(2026, 0, 5, 12))).toBe(true);
    expect(scheduledOn(habit, new Date(2026, 0, 6, 12))).toBe(false);
  });

  it('calculates a partial calendar week from the configured week start', () => {
    const now = new Date(2026, 0, 7, 12);
    expect(habitCompletionPercent(habit, [log('2026-01-05')], 7, now, 1)).toBe(50);
    expect(habitCompletionPercent(habit, [log('2026-01-05'), log('2026-01-07')], 7, now, 1)).toBe(100);
  });

  it('counts weekly targets toward their target and honors explicit rest days', () => {
    const weekly: Habit = { ...habit, frequency: 'weekly', weeklyTarget: 3 };
    const now = new Date(2026, 0, 7, 12);
    expect(habitCompletionPercent(weekly, [log('2026-01-05')], 7, now, 1)).toBe(33);
    expect(habitCompletionPercent(habit, [log('2026-01-05'), log('2026-01-07', 'skip')], 7, now, 1)).toBe(100);
  });

  it('counts scheduled-day streaks without penalizing rest days', () => {
    const now = new Date(2026, 0, 7, 12);
    expect(habitCurrentStreak(habit, [log('2026-01-05'), log('2026-01-07')], now)).toBe(2);
    expect(habitCurrentStreak(habit, [log('2026-01-05')], now)).toBe(1);
  });

  it('tracks reduction targets from avoidance events and caps progress at 100%', () => {
    const reduction: Habit = { ...habit, kind: 'reduction', frequency: 'weekly', weeklyTarget: 3 };
    const events = [log('2026-01-07', 'avoid', 'avoid-1'), log('2026-01-06', 'avoid', 'avoid-2')];
    expect(reductionTargetPercent(reduction, events, 1, new Date(2026, 0, 7, 12))).toBe(67);
    expect(reductionTargetPercent(reduction, [...events, log('2026-01-07', 'avoid', 'avoid-3')], 1, new Date(2026, 0, 7, 12))).toBe(100);
  });

  it('derives current and best avoidance streaks for reduction habits', () => {
    const reduction: Habit = { ...habit, kind: 'reduction' };
    const events = [log('2026-01-05', 'avoid'), log('2026-01-07', 'avoid')];
    const now = new Date(2026, 0, 7, 12);
    expect(habitCurrentStreak(reduction, events, now, 'avoid')).toBe(2);
    expect(habitBestStreak(reduction, events, 'avoid')).toBe(2);
  });

  it('leaves weekly chart ratios empty when there is no scheduled denominator', () => {
    const result = weeklyCompletion([habit], [], [], new Date(2026, 0, 7, 12));
    const restDay = result.find((day) => day.date === '2026-01-04');
    expect(restDay?.habits).toBeNull();
    expect(restDay?.tasks).toBeNull();
    expect(result.reduce((sum, day) => sum + day.activity, 0)).toBe(0);
  });
});

describe('task transitions and recurrence', () => {
  it('sets and clears completion date when a task is completed or reopened', () => {
    const completed = taskStatusTransition(task, true, new Date(2026, 0, 7, 12));
    expect(completed).toMatchObject({ status: 'done', completedAt: '2026-01-07' });
    expect(taskStatusTransition(completed, false)).toMatchObject({ status: 'todo', completedAt: null });
  });

  it('clamps monthly recurrence to the final valid day of the next month', () => {
    expect(nextRecurrenceDate(task)).toBe('2026-02-28');
    expect(nextRecurrenceDate({ ...task, recurrence: 'weekly' })).toBe('2026-02-07');
    expect(nextRecurrenceDate({ ...task, recurrence: 'none' })).toBeNull();
  });

  it('derives a stable, valid UUID for a recurring task occurrence', async () => {
    const first = await recurringTaskId(task.id, '2026-02-28');
    expect(await recurringTaskId(task.id, '2026-02-28')).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await recurringTaskId(task.id, '2026-03-28')).not.toBe(first);
  });
});

describe('transparent goal and course progress', () => {
  const goal: Goal = {
    id: 'goal-1', title: 'Build a portfolio', description: '', category: 'Career', horizon: '90 days',
    startDate: '', targetDate: '', status: 'active', priority: 'medium', progressMode: 'manual', manualProgress: 40,
    successCriteria: '', parentGoalId: null, habitIds: [], taskIds: ['task-a'], roadmapNodeIds: [], courseIds: [],
    notes: '', createdAt: '2026-01-01T12:00:00.000Z',
  };

  it('uses the selected goal progress rule and deduplicates linked tasks', () => {
    expect(goalProgress(goal, [], [])).toBe(40);
    const milestones: Milestone[] = [
      { id: 'm1', goalId: goal.id, title: 'Outline', dueDate: '', completed: true },
      { id: 'm2', goalId: goal.id, title: 'Publish', dueDate: '', completed: false },
    ];
    expect(goalProgress({ ...goal, progressMode: 'milestones' }, milestones, [])).toBe(50);
    const tasks: Task[] = [
      { ...task, id: 'task-a', goalId: goal.id, status: 'done' },
      { ...task, id: 'task-b', goalId: goal.id, status: 'todo' },
    ];
    expect(goalProgress({ ...goal, progressMode: 'tasks', taskIds: ['task-a'] }, [], tasks)).toBe(50);
    const child = { ...goal, id: 'goal-child', parentGoalId: goal.id };
    expect(hasGoalCycle([goal, child], goal.id, child.id)).toBe(true);
    expect(hasGoalCycle([goal, child], child.id, null)).toBe(false);
  });

  it('derives ordinary and weighted course progress from completed lessons', () => {
    const lessons: Lesson[] = [
      { id: 'lesson-a', sectionId: 'section-a', title: 'A', durationMinutes: null, externalUrl: '', notes: '', order: 0, weight: 1 },
      { id: 'lesson-b', sectionId: 'section-a', title: 'B', durationMinutes: null, externalUrl: '', notes: '', order: 1, weight: 3 },
    ];
    const completed: LessonProgress[] = [{ id: 'progress-a', lessonId: 'lesson-b', completed: true, completedAt: '2026-01-07' }];
    expect(courseProgress(lessons, completed)).toBe(50);
    expect(courseProgress(lessons, completed, 'weighted')).toBe(75);
    expect(courseProgress([], completed)).toBe(0);
  });
});

describe('roadmap DAG validation', () => {
  it('rejects self edges and dependency edges that close a cycle', () => {
    const edges: RoadmapEdge[] = [
      { id: 'edge-1', roadmapId: 'map-1', source: 'A', target: 'B', kind: 'dependency' },
      { id: 'edge-2', roadmapId: 'map-1', source: 'B', target: 'C', kind: 'dependency' },
    ];
    expect(hasRoadmapCycle(edges, 'C', 'A')).toBe(true);
    expect(hasRoadmapCycle(edges, 'A', 'A')).toBe(true);
    expect(hasRoadmapCycle(edges, 'C', 'D')).toBe(false);
    const treeEdges: RoadmapEdge[] = [{ id: 'tree-ab', roadmapId: 'map-1', source: 'A', target: 'B', kind: 'tree' }];
    expect(hasRoadmapCycle(treeEdges, 'B', 'A', 'tree')).toBe(true);
    expect(hasRoadmapCycle(treeEdges, 'B', 'A')).toBe(false);
    const nodes = [{ id: 'A', parentId: null }, { id: 'B', parentId: 'A' }, { id: 'C', parentId: 'B' }];
    expect(hasRoadmapTreeCycle(nodes, 'A', 'C')).toBe(true);
    expect(hasRoadmapTreeCycle(nodes, 'C', 'A')).toBe(false);
  });
});
