import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { CollectionName, Preferences, Workspace } from '../shared/types';
import type { Goal } from '../shared/types';
import { requirePool } from './db/client';
import type { AuthContext } from './auth';
import { hasGoalCycle, hasRoadmapCycle, hasRoadmapTreeCycle } from '../src/lib/calculations';
import { courseInputSchema, goalInputSchema, goalReviewInputSchema, habitInputSchema, roadmapNodeInputSchema, taskInputSchema } from '../src/lib/validation';

interface CollectionDefinition { table: string; columns?: (record: Record<string, unknown>) => Record<string, unknown>; }
const collections: Record<CollectionName, CollectionDefinition> = {
  habits: { table: 'habits' },
  habitLogs: { table: 'habit_logs', columns: (r) => ({ habit_id: r.habitId, log_date: r.date, kind: r.kind }) },
  tasks: { table: 'tasks', columns: (r) => ({ goal_id: r.goalId, due_date: r.dueDate, status: r.status }) },
  subtasks: { table: 'task_subtasks', columns: (r) => ({ task_id: r.taskId }) },
  goals: { table: 'goals', columns: (r) => ({ parent_goal_id: r.parentGoalId }) },
  milestones: { table: 'goal_milestones', columns: (r) => ({ goal_id: r.goalId, due_date: r.dueDate }) },
  roadmaps: { table: 'roadmaps' },
  roadmapNodes: { table: 'roadmap_nodes', columns: (r) => ({ roadmap_id: r.roadmapId, parent_id: r.parentId, goal_id: r.goalId, task_id: r.taskId }) },
  roadmapEdges: { table: 'roadmap_edges', columns: (r) => ({ roadmap_id: r.roadmapId, source_id: r.source, target_id: r.target, edge_kind: r.kind }) },
  courses: { table: 'courses', columns: (r) => ({ goal_id: r.goalId }) },
  courseSections: { table: 'course_sections', columns: (r) => ({ course_id: r.courseId }) },
  lessons: { table: 'lessons', columns: (r) => ({ section_id: r.sectionId }) },
  lessonProgress: { table: 'lesson_progress', columns: (r) => ({ lesson_id: r.lessonId }) },
  goalReviews: { table: 'goal_reviews', columns: (r) => ({ goal_id: r.goalId }) },
  notes: { table: 'notes', columns: (r) => ({ entity_type: r.entityType, entity_id: r.entityId }) },
};
const defaults: Preferences = {
  theme: 'system', weekStartsOn: 1,
  dashboardWidgets: ['habits', 'tasks', 'goals', 'learning'], displayName: '',
};
const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(''));
const recordSchema = z.object({ id: uuidSchema }).passthrough();
const preferenceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']), weekStartsOn: z.number().int().min(0).max(6),
  dashboardWidgets: z.array(z.string().max(40)).max(20), displayName: z.string().max(80),
});
const idRecord = z.string().uuid();
const specificSchemas: Partial<Record<CollectionName, z.ZodType>> = {
  habits: habitInputSchema.passthrough(),
  habitLogs: z.object({ habitId: idRecord, date: dateSchema, kind: z.enum(['complete', 'avoid', 'lapse', 'skip']), note: z.string().max(2000), createdAt: z.string() }).passthrough(),
  tasks: taskInputSchema.passthrough(),
  subtasks: z.object({ taskId: idRecord, title: z.string().trim().min(1).max(160), completed: z.boolean() }).passthrough(),
  goals: goalInputSchema.passthrough(),
  milestones: z.object({ goalId: idRecord, title: z.string().trim().min(1).max(160), dueDate: dateSchema, completed: z.boolean() }).passthrough(),
  roadmaps: z.object({ title: z.string().trim().min(1).max(160), description: z.string().max(2000), createdAt: z.string() }).passthrough(),
  roadmapNodes: roadmapNodeInputSchema.passthrough(),
  roadmapEdges: z.object({ roadmapId: idRecord, source: idRecord, target: idRecord, kind: z.enum(['tree', 'dependency', 'related']) }).passthrough(),
  courses: courseInputSchema.passthrough(),
  courseSections: z.object({ courseId: idRecord, title: z.string().trim().min(1).max(160), order: z.number().int().min(0) }).passthrough(),
  lessons: z.object({ sectionId: idRecord, title: z.string().trim().min(1).max(160), durationMinutes: z.number().int().positive().nullable(), externalUrl: z.string().url().or(z.literal('')), notes: z.string().max(4000), order: z.number().int().min(0), weight: z.number().int().min(1).max(100) }).passthrough(),
  lessonProgress: z.object({ lessonId: idRecord, completed: z.boolean(), completedAt: dateSchema.nullable() }).passthrough(),
  goalReviews: goalReviewInputSchema.passthrough(),
  notes: z.object({ entityType: z.string().min(1).max(50), entityId: idRecord, content: z.string().max(10000), updatedAt: z.string() }).passthrough(),
};
const maxRecordSize = 96_000;
type SqlScalar = string | number | boolean | Date | Buffer | null;

function parsePayload(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>;
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  throw new Error('Stored workspace record is not valid JSON.');
}
function sqlValue(value: unknown): SqlScalar {
  if (value === '' || value === undefined || value === null) return null;
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
}
function validateRecord(collection: CollectionName, raw: unknown): Record<string, unknown> | null {
  const generic = recordSchema.safeParse(raw);
  if (!generic.success || Buffer.byteLength(JSON.stringify(raw), 'utf8') > maxRecordSize) return null;
  const specific = specificSchemas[collection];
  if (!specific) return generic.data;
  const entity = { ...(generic.data as Record<string, unknown>) };
  delete entity.id;
  const parsed = specific.safeParse(entity);
  if (!parsed.success) return null;
  return { id: generic.data.id, ...(parsed.data as Record<string, unknown>) };
}
function resourceName(value: unknown): CollectionName | null {
  return typeof value === 'string' && Object.hasOwn(collections, value) ? value as CollectionName : null;
}
function authContext(res: Response): AuthContext {
  return res.locals.auth as AuthContext;
}

export async function readWorkspace(userId: string): Promise<Workspace> {
  const pool = requirePool();
  const result: Record<string, unknown> = {};
  await Promise.all(Object.entries(collections).map(async ([key, definition]) => {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT payload FROM ${definition.table} WHERE user_id = ? ORDER BY created_at ASC`, [userId]);
    result[key] = rows.map((row) => parsePayload(row.payload));
  }));
  const [preferenceRows] = await pool.execute<RowDataPacket[]>('SELECT payload FROM user_preferences WHERE user_id = ? LIMIT 1', [userId]);
  result.preferences = preferenceRows[0] ? parsePayload(preferenceRows[0].payload) : defaults;
  return result as unknown as Workspace;
}

export function workspaceRouter() {
  const router = Router();
  router.get('/workspace', async (_req, res) => {
    try {
      res.json(await readWorkspace(authContext(res).user.id));
    } catch (error) {
      console.error('workspace_read_failed', error instanceof Error ? error.message : 'unknown');
      res.status(503).json({ error: 'Your workspace could not be loaded. Check the connection and retry.' });
    }
  });
  router.put('/preferences', async (req, res) => {
    const context = authContext(res);
    const parsed = preferenceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Preferences did not pass validation.' });
    const payload = { ...defaults, ...parsed.data };
    try {
      await requirePool().execute(
        `INSERT INTO user_preferences (id, user_id, payload) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
        [context.user.id, context.user.id, JSON.stringify(payload)],
      );
      return res.json(payload);
    } catch (error) {
      console.error('preferences_write_failed', error instanceof Error ? error.message : 'unknown');
      return res.status(503).json({ error: 'Preferences could not be saved.' });
    }
  });
  router.post('/data/:collection', async (req, res) => saveRecord(req, res, false));
  router.put('/data/:collection/:id', async (req, res) => saveRecord(req, res, true));
  router.delete('/data/:collection/:id', async (req, res) => deleteRecord(req, res));
  return router;
}

async function saveRecord(req: Request, res: Response, update: boolean) {
  const context = authContext(res);
  const collection = resourceName(req.params.collection);
  if (!collection) return res.status(404).json({ error: 'Unknown workspace collection.' });
  const record = validateRecord(collection, req.body);
  if (!record) return res.status(400).json({ error: 'This record did not pass validation or exceeds the allowed size.' });
  const id = String(record.id);
  const routeId = req.params.id;
  if (update && (typeof routeId !== 'string' || routeId !== id)) return res.status(400).json({ error: 'The record identifier does not match the route.' });
  const definition = collections[collection];
  const entries = Object.entries(definition.columns?.(record) ?? {});
  const payload = JSON.stringify(record);
  const columnNames = ['id', 'user_id', 'payload', ...entries.map(([column]) => column)];
  const values: SqlScalar[] = [id, context.user.id, payload, ...entries.map(([, value]) => sqlValue(value))];
  try {
    const relationshipError = await validateRelationships(collection, record, context.user.id);
    if (relationshipError) return res.status(relationshipError.status).json({ error: relationshipError.message });
    if (!update) {
      await requirePool().execute(
        `INSERT INTO ${definition.table} (${columnNames.join(', ')}) VALUES (${columnNames.map(() => '?').join(', ')})`, values,
      );
      return res.status(201).json(record);
    }
    const setSql = ['payload = ?', ...entries.map(([column]) => `${column} = ?`)].join(', ');
    const [result] = await requirePool().execute<ResultSetHeader>(
      `UPDATE ${definition.table} SET ${setSql} WHERE id = ? AND user_id = ?`,
      [payload, ...entries.map(([, value]) => sqlValue(value)), id, context.user.id],
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Record not found in this workspace.' });
    return res.json(record);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That record already exists.' });
    if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'A linked record is missing, belongs to another workspace, or is still in use.' });
    console.error('workspace_write_failed', collection, code ?? 'unknown');
    return res.status(503).json({ error: 'The record could not be saved. Check the connection and retry.' });
  }
}

async function validateRelationships(collection: CollectionName, record: Record<string, unknown>, userId: string): Promise<{ status: number; message: string } | null> {
  const pool = requirePool();
  if (collection === 'goals') {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT payload FROM goals WHERE user_id = ?', [userId]);
    const goals = rows.map((row) => parsePayload(row.payload) as unknown as Goal);
    const parentId = typeof record.parentGoalId === 'string' ? record.parentGoalId : null;
    if (hasGoalCycle(goals, String(record.id), parentId)) return { status: 400, message: 'A goal cannot be its own ancestor.' };
    const relations: Array<[string, unknown]> = [
      ['habits', record.habitIds], ['tasks', record.taskIds], ['roadmap_nodes', record.roadmapNodeIds], ['courses', record.courseIds],
    ];
    for (const [table, rawIds] of relations) {
      const ids = Array.isArray(rawIds) ? [...new Set(rawIds.filter((value): value is string => typeof value === 'string'))] : [];
      if (!ids.length) continue;
      const [found] = await pool.execute<RowDataPacket[]>(`SELECT id FROM ${table} WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [userId, ...ids]);
      if (found.length !== ids.length) return { status: 409, message: 'A linked habit, task, roadmap node, or course is missing or outside this workspace.' };
    }
  }
  if (collection === 'roadmapNodes') {
    const roadmapId = String(record.roadmapId);
    const parentId = typeof record.parentId === 'string' ? record.parentId : null;
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT payload FROM roadmap_nodes WHERE user_id = ? AND roadmap_id = ?', [userId, roadmapId]);
    const nodes = rows.map((row) => parsePayload(row.payload) as { id: string; parentId: string | null });
    if (hasRoadmapTreeCycle(nodes, String(record.id), parentId)) return { status: 400, message: 'A roadmap node cannot be its own ancestor.' };
    if (parentId && !nodes.some((node) => node.id === parentId)) return { status: 409, message: 'Choose a parent from the same roadmap.' };
  }
  if (collection === 'roadmapEdges') {
    const roadmapId = String(record.roadmapId);
    const source = String(record.source);
    const target = String(record.target);
    if (source === target) return { status: 400, message: 'A node cannot connect to itself.' };
    const [nodeRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM roadmap_nodes WHERE user_id = ? AND roadmap_id = ? AND id IN (?, ?)', [userId, roadmapId, source, target],
    );
    if (nodeRows.length !== 2) return { status: 409, message: 'Both connected nodes must belong to this roadmap and workspace.' };
    if (record.kind === 'dependency' || record.kind === 'tree') {
      const [edgeRows] = await pool.execute<RowDataPacket[]>(
        'SELECT payload FROM roadmap_edges WHERE user_id = ? AND roadmap_id = ?', [userId, roadmapId],
      );
      const edges = edgeRows.map((row) => parsePayload(row.payload) as { id: string; roadmapId: string; source: string; target: string; kind: 'tree' | 'dependency' | 'related' }).filter((edge) => edge.id !== record.id && edge.kind === record.kind);
      if (hasRoadmapCycle(edges, source, target, record.kind)) return { status: 400, message: 'That connection would create a cycle.' };
    }
  }
  return null;
}

async function deleteRecord(req: Request, res: Response) {
  const context = authContext(res);
  const collection = resourceName(req.params.collection);
  const id = req.params.id;
  if (!collection || typeof id !== 'string' || !uuidSchema.safeParse(id).success) return res.status(404).json({ error: 'Workspace record not found.' });
  const pool = requirePool();
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    const goalField = collection === 'habits' ? 'habitIds' : collection === 'tasks' ? 'taskIds' : collection === 'roadmapNodes' || collection === 'roadmaps' ? 'roadmapNodeIds' : collection === 'courses' ? 'courseIds' : null;
    let linkedIds = [id];
    if (collection === 'roadmaps') {
      const [nodeRows] = await connection.execute<RowDataPacket[]>('SELECT id FROM roadmap_nodes WHERE user_id = ? AND roadmap_id = ?', [context.user.id, id]);
      linkedIds = nodeRows.map((row) => String(row.id));
    }
    if (goalField && linkedIds.length) {
      const [goalRows] = await connection.execute<RowDataPacket[]>('SELECT id, payload FROM goals WHERE user_id = ? FOR UPDATE', [context.user.id]);
      for (const row of goalRows) {
        const payload = parsePayload(row.payload);
        const references = Array.isArray(payload[goalField]) ? payload[goalField] as string[] : [];
        const filtered = references.filter((reference) => !linkedIds.includes(reference));
        if (filtered.length !== references.length) {
          payload[goalField] = filtered;
          await connection.execute('UPDATE goals SET payload = ? WHERE id = ? AND user_id = ?', [JSON.stringify(payload), row.id, context.user.id]);
        }
      }
    }
    const [result] = await connection.execute<ResultSetHeader>(
      `DELETE FROM ${collections[collection].table} WHERE id = ? AND user_id = ?`, [id, context.user.id],
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ error: 'Record not found in this workspace.' });
    }
    await connection.commit();
    transactionStarted = false;
    return res.status(204).end();
  } catch (error) {
    if (transactionStarted && connection) await connection.rollback();
    const code = (error as { code?: string }).code;
    if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_NO_REFERENCED_ROW_2') return res.status(409).json({ error: 'Move or remove its linked items before deleting this record.' });
    console.error('workspace_delete_failed', collection, code ?? 'unknown');
    return res.status(503).json({ error: 'The record could not be deleted.' });
  } finally {
    connection?.release();
  }
}
