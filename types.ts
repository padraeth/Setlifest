export type ID = string;
export type Priority = 'low' | 'medium' | 'high';
export type HabitKind = 'positive' | 'reduction';
export type HabitLogKind = 'complete' | 'avoid' | 'lapse' | 'skip';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ProgressMode = 'manual' | 'milestones' | 'tasks';
export type RoadmapNodeKind = 'objective' | 'goal' | 'milestone' | 'action' | 'decision' | 'learning';
export type RoadmapNodeStatus = 'planned' | 'active' | 'complete' | 'blocked';
export type CourseStatus = 'active' | 'paused' | 'completed' | 'archived';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface User { id: ID; name: string; email: string | null; }
export interface Habit {
  id: ID; name: string; description: string; category: string; kind: HabitKind; icon: string;
  frequency: 'daily' | 'weekly'; weekdays: number[]; weeklyTarget: number; reminderTime: string;
  startDate: string; durationDays: number | null; accent: string; createdAt: string;
}
export interface HabitLog { id: ID; habitId: ID; date: string; kind: HabitLogKind; note: string; createdAt: string; }
export interface Subtask { id: ID; taskId: ID; title: string; completed: boolean; }
export interface Task {
  id: ID; title: string; description: string; dueDate: string; startDate: string; priority: Priority;
  status: TaskStatus; category: string; estimateMinutes: number | null; tags: string[]; recurrence: RepeatRule;
  goalId: ID | null; createdAt: string; completedAt: string | null;
}
export interface Milestone { id: ID; goalId: ID; title: string; dueDate: string; completed: boolean; }
export interface Goal {
  id: ID; title: string; description: string; category: string; horizon: string; startDate: string;
  targetDate: string; status: GoalStatus; priority: Priority; progressMode: ProgressMode; manualProgress: number;
  successCriteria: string; parentGoalId: ID | null; habitIds: ID[]; taskIds: ID[]; roadmapNodeIds: ID[];
  courseIds: ID[]; notes: string; createdAt: string;
}
export interface GoalReview { id: ID; goalId: ID; reviewedAt: string; progress: number; note: string; }
export interface RoadmapNode {
  id: ID; roadmapId: ID; parentId: ID | null; title: string; description: string; kind: RoadmapNodeKind;
  status: RoadmapNodeStatus; priority: Priority; dueDate: string; progress: number; notes: string;
  taskId: ID | null; goalId: ID | null; position: { x: number; y: number };
}
export interface RoadmapEdge { id: ID; roadmapId: ID; source: ID; target: ID; kind: 'tree' | 'dependency' | 'related'; }
export interface Roadmap { id: ID; title: string; description: string; createdAt: string; }
export interface CourseSection { id: ID; courseId: ID; title: string; order: number; }
export interface Lesson { id: ID; sectionId: ID; title: string; durationMinutes: number | null; externalUrl: string; notes: string; order: number; weight: number; }
export interface LessonProgress { id: ID; lessonId: ID; completed: boolean; completedAt: string | null; }
export interface Course {
  id: ID; name: string; description: string; category: string; instructor: string; cover: string;
  externalUrl: string; startDate: string; targetDate: string; status: CourseStatus;
  progressMode: 'lessons' | 'weighted'; goalId: ID | null; notes: string; lastAccessedLessonId: ID | null; createdAt: string;
}
export interface Note { id: ID; entityType: string; entityId: ID; content: string; updatedAt: string; }
export interface Preferences { theme: 'light' | 'dark' | 'system'; weekStartsOn: number; dashboardWidgets: string[]; displayName: string; }
export interface Workspace {
  habits: Habit[]; habitLogs: HabitLog[]; tasks: Task[]; subtasks: Subtask[]; goals: Goal[]; milestones: Milestone[];
  roadmaps: Roadmap[]; roadmapNodes: RoadmapNode[]; roadmapEdges: RoadmapEdge[]; courses: Course[];
  courseSections: CourseSection[]; lessons: Lesson[]; lessonProgress: LessonProgress[]; goalReviews: GoalReview[]; notes: Note[]; preferences: Preferences;
}
export interface AuthState { user: User | null; csrfToken: string | null; loading: boolean; error: string | null; }
export type CollectionName = Exclude<keyof Workspace, 'preferences'>;
