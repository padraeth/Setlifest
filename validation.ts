import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(''));
const id = z.string().uuid();
const optionalWebUrl = z.string().max(2000).refine((value) => value === '' || /^https?:\/\//i.test(value), 'Use a valid https:// or http:// URL.');

export const habitInputSchema = z.object({
  name: z.string().trim().min(1).max(100), description: z.string().max(2000).default(''), category: z.string().max(60).default('Personal'),
  kind: z.enum(['positive', 'reduction']), icon: z.string().max(24).default('sparkles'), frequency: z.enum(['daily', 'weekly']),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7), weeklyTarget: z.number().int().min(1).max(7),
  reminderTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).or(z.literal('')).default(''), startDate: dateString,
  durationDays: z.number().int().positive().nullable().default(null), accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3168F5'),
});
export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(160), description: z.string().max(4000).default(''), dueDate: dateString,
  startDate: dateString, priority: z.enum(['low', 'medium', 'high']), status: z.enum(['todo', 'in_progress', 'done']),
  category: z.string().max(80).default('Personal'), estimateMinutes: z.number().int().positive().nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(30)).max(10), recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']),
  goalId: id.nullable(), createdAt: z.string(), completedAt: dateString.nullable(),
});
export const goalInputSchema = z.object({
  title: z.string().trim().min(1).max(160), description: z.string().max(4000).default(''), category: z.string().max(80),
  horizon: z.string().max(80), startDate: dateString, targetDate: dateString, status: z.enum(['active', 'paused', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high']), progressMode: z.enum(['manual', 'milestones', 'tasks']), manualProgress: z.number().min(0).max(100),
  successCriteria: z.string().max(1000), parentGoalId: id.nullable(), habitIds: z.array(id), taskIds: z.array(id),
  roadmapNodeIds: z.array(id), courseIds: z.array(id), notes: z.string().max(6000), createdAt: z.string(),
});
export const goalReviewInputSchema = z.object({
  goalId: id, reviewedAt: z.string().datetime(), progress: z.number().int().min(0).max(100), note: z.string().trim().min(1).max(2000),
});
export const roadmapNodeInputSchema = z.object({
  roadmapId: id, parentId: id.nullable(), title: z.string().trim().min(1).max(160), description: z.string().max(2000),
  kind: z.enum(['objective', 'goal', 'milestone', 'action', 'decision', 'learning']),
  status: z.enum(['planned', 'active', 'complete', 'blocked']), priority: z.enum(['low', 'medium', 'high']),
  dueDate: dateString, progress: z.number().min(0).max(100), notes: z.string().max(4000),
  taskId: id.nullable(), goalId: id.nullable(), position: z.object({ x: z.number().finite(), y: z.number().finite() }),
});
export const courseInputSchema = z.object({
  name: z.string().trim().min(1).max(160), description: z.string().max(4000), category: z.string().max(80),
  instructor: z.string().max(160), cover: z.string().max(500), externalUrl: optionalWebUrl,
  startDate: dateString, targetDate: dateString, status: z.enum(['active', 'paused', 'completed', 'archived']),
  progressMode: z.enum(['lessons', 'weighted']), goalId: id.nullable(), notes: z.string().max(6000),
  lastAccessedLessonId: id.nullable(), createdAt: z.string(),
});
export const recordSchema = z.object({ id }).passthrough();
