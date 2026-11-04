import { char, date, foreignKey, index, json, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const workspaceUsers = mysqlTable('workspace_users', {
  id: char('id', { length: 36 }).primaryKey(),
  openId: varchar('open_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 320 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [
  uniqueIndex('uq_workspace_users_open_id').on(table.openId),
  uniqueIndex('uq_workspace_users_id').on(table.id),
]);

export const workspaceSessions = mysqlTable('workspace_sessions', {
  tokenHash: char('token_hash', { length: 64 }).primaryKey(),
  userId: char('user_id', { length: 36 }).notNull(),
  csrfToken: char('csrf_token', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_workspace_sessions_user').on(table.userId),
  index('idx_workspace_sessions_expiry').on(table.expiresAt),
  foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_workspace_sessions_user' }).onDelete('cascade'),
]);

export const habits = mysqlTable('habits', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), payload: json('payload').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [uniqueIndex('uq_habits_owner_id').on(table.userId, table.id), index('idx_habits_owner').on(table.userId), foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_habits_user' }).onDelete('cascade')]);

export const habitLogs = mysqlTable('habit_logs', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), habitId: char('habit_id', { length: 36 }).notNull(),
  logDate: date('log_date', { mode: 'string' }).notNull(), kind: varchar('kind', { length: 20 }).notNull(), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_habit_logs_owner_id').on(table.userId, table.id), index('idx_habit_logs_owner_date').on(table.userId, table.logDate), index('idx_habit_logs_habit_date').on(table.userId, table.habitId, table.logDate),
  foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_habit_logs_user' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.habitId], foreignColumns: [habits.userId, habits.id], name: 'fk_habit_logs_habit' }).onDelete('cascade'),
]);

export const goals = mysqlTable('goals', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), parentGoalId: char('parent_goal_id', { length: 36 }), payload: json('payload').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [
  uniqueIndex('uq_goals_owner_id').on(table.userId, table.id), index('idx_goals_owner').on(table.userId), index('idx_goals_parent').on(table.userId, table.parentGoalId),
  foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_goals_user' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.parentGoalId], foreignColumns: [table.userId, table.id], name: 'fk_goals_parent' }).onDelete('restrict'),
]);

export const tasks = mysqlTable('tasks', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), goalId: char('goal_id', { length: 36 }), dueDate: date('due_date', { mode: 'string' }),
  status: varchar('status', { length: 20 }).notNull(), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [
  uniqueIndex('uq_tasks_owner_id').on(table.userId, table.id), index('idx_tasks_owner_status_due').on(table.userId, table.status, table.dueDate),
  foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_tasks_user' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.goalId], foreignColumns: [goals.userId, goals.id], name: 'fk_tasks_goal' }).onDelete('restrict'),
]);

export const taskSubtasks = mysqlTable('task_subtasks', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), taskId: char('task_id', { length: 36 }).notNull(), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_task_subtasks_owner_id').on(table.userId, table.id), index('idx_task_subtasks_task').on(table.userId, table.taskId),
  foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_task_subtasks_user' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.taskId], foreignColumns: [tasks.userId, tasks.id], name: 'fk_task_subtasks_task' }).onDelete('cascade'),
]);

export const goalMilestones = mysqlTable('goal_milestones', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), goalId: char('goal_id', { length: 36 }).notNull(), dueDate: date('due_date', { mode: 'string' }), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_goal_milestones_owner_id').on(table.userId, table.id), index('idx_goal_milestones_goal').on(table.userId, table.goalId, table.dueDate),
  foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_goal_milestones_user' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.goalId], foreignColumns: [goals.userId, goals.id], name: 'fk_goal_milestones_goal' }).onDelete('cascade'),
]);

export const roadmaps = mysqlTable('roadmaps', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [uniqueIndex('uq_roadmaps_owner_id').on(table.userId, table.id), index('idx_roadmaps_owner').on(table.userId), foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_roadmaps_user' }).onDelete('cascade')]);

export const roadmapNodes = mysqlTable('roadmap_nodes', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), roadmapId: char('roadmap_id', { length: 36 }).notNull(), parentId: char('parent_id', { length: 36 }), goalId: char('goal_id', { length: 36 }), taskId: char('task_id', { length: 36 }),
  payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [
  uniqueIndex('uq_roadmap_nodes_owner_id').on(table.userId, table.id), index('idx_roadmap_nodes_roadmap').on(table.userId, table.roadmapId), index('idx_roadmap_nodes_parent').on(table.userId, table.parentId),
  foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_roadmap_nodes_user' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.roadmapId], foreignColumns: [roadmaps.userId, roadmaps.id], name: 'fk_roadmap_nodes_roadmap' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.parentId], foreignColumns: [table.userId, table.id], name: 'fk_roadmap_nodes_parent' }).onDelete('restrict'),
  foreignKey({ columns: [table.userId, table.goalId], foreignColumns: [goals.userId, goals.id], name: 'fk_roadmap_nodes_goal' }).onDelete('restrict'),
  foreignKey({ columns: [table.userId, table.taskId], foreignColumns: [tasks.userId, tasks.id], name: 'fk_roadmap_nodes_task' }).onDelete('restrict'),
]);

export const roadmapEdges = mysqlTable('roadmap_edges', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), roadmapId: char('roadmap_id', { length: 36 }).notNull(), sourceId: char('source_id', { length: 36 }).notNull(), targetId: char('target_id', { length: 36 }).notNull(), edgeKind: varchar('edge_kind', { length: 20 }).notNull(), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_roadmap_edges_owner_id').on(table.userId, table.id), index('idx_roadmap_edges_roadmap').on(table.userId, table.roadmapId),
  foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_roadmap_edges_user' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.roadmapId], foreignColumns: [roadmaps.userId, roadmaps.id], name: 'fk_roadmap_edges_roadmap' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.sourceId], foreignColumns: [roadmapNodes.userId, roadmapNodes.id], name: 'fk_roadmap_edges_source' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.targetId], foreignColumns: [roadmapNodes.userId, roadmapNodes.id], name: 'fk_roadmap_edges_target' }).onDelete('cascade'),
]);

export const courses = mysqlTable('courses', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), goalId: char('goal_id', { length: 36 }), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [
  uniqueIndex('uq_courses_owner_id').on(table.userId, table.id), index('idx_courses_owner').on(table.userId),
  foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_courses_user' }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.goalId], foreignColumns: [goals.userId, goals.id], name: 'fk_courses_goal' }).onDelete('restrict'),
]);

export const courseSections = mysqlTable('course_sections', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), courseId: char('course_id', { length: 36 }).notNull(), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [uniqueIndex('uq_course_sections_owner_id').on(table.userId, table.id), index('idx_course_sections_course').on(table.userId, table.courseId), foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_course_sections_user' }).onDelete('cascade'), foreignKey({ columns: [table.userId, table.courseId], foreignColumns: [courses.userId, courses.id], name: 'fk_course_sections_course' }).onDelete('cascade')]);

export const lessons = mysqlTable('lessons', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), sectionId: char('section_id', { length: 36 }).notNull(), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [uniqueIndex('uq_lessons_owner_id').on(table.userId, table.id), index('idx_lessons_section').on(table.userId, table.sectionId), foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_lessons_user' }).onDelete('cascade'), foreignKey({ columns: [table.userId, table.sectionId], foreignColumns: [courseSections.userId, courseSections.id], name: 'fk_lessons_section' }).onDelete('cascade')]);

export const lessonProgress = mysqlTable('lesson_progress', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), lessonId: char('lesson_id', { length: 36 }).notNull(), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [uniqueIndex('uq_lesson_progress_owner_id').on(table.userId, table.id), index('idx_lesson_progress_lesson').on(table.userId, table.lessonId), foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_lesson_progress_user' }).onDelete('cascade'), foreignKey({ columns: [table.userId, table.lessonId], foreignColumns: [lessons.userId, lessons.id], name: 'fk_lesson_progress_lesson' }).onDelete('cascade')]);

export const notes = mysqlTable('notes', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), entityType: varchar('entity_type', { length: 50 }).notNull(), entityId: char('entity_id', { length: 36 }).notNull(), payload: json('payload').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [uniqueIndex('uq_notes_owner_id').on(table.userId, table.id), index('idx_notes_entity').on(table.userId, table.entityType, table.entityId), foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_notes_user' }).onDelete('cascade')]);

export const userPreferences = mysqlTable('user_preferences', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), payload: json('payload').notNull(), updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [uniqueIndex('uq_user_preferences_owner').on(table.userId), foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_user_preferences_user' }).onDelete('cascade')]);

export const goalReviews = mysqlTable('goal_reviews', {
  id: char('id', { length: 36 }).primaryKey(), userId: char('user_id', { length: 36 }).notNull(), goalId: char('goal_id', { length: 36 }).notNull(), payload: json('payload').notNull(), createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [uniqueIndex('uq_goal_reviews_owner_id').on(table.userId, table.id), index('idx_goal_reviews_goal').on(table.userId, table.goalId, table.createdAt), foreignKey({ columns: [table.userId], foreignColumns: [workspaceUsers.id], name: 'fk_goal_reviews_user' }).onDelete('cascade'), foreignKey({ columns: [table.userId, table.goalId], foreignColumns: [goals.userId, goals.id], name: 'fk_goal_reviews_goal' }).onDelete('cascade')]);

export const schemaMigrations = mysqlTable('schema_migrations', {
  version: varchar('version', { length: 100 }).primaryKey(), appliedAt: timestamp('applied_at').notNull().defaultNow(),
});

export const workspaceRecords = { habits, habitLogs, goals, tasks, taskSubtasks, goalMilestones, roadmaps, roadmapNodes, roadmapEdges, courses, courseSections, lessons, lessonProgress, notes, userPreferences, goalReviews };
