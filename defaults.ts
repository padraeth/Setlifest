import type { Preferences, Workspace } from '../../shared/types';

export const defaultPreferences: Preferences = {
  theme: 'system', weekStartsOn: 1,
  dashboardWidgets: ['habits', 'tasks', 'goals', 'learning'], displayName: '',
};

export function emptyWorkspace(): Workspace {
  return {
    habits: [], habitLogs: [], tasks: [], subtasks: [], goals: [], milestones: [], roadmaps: [],
    roadmapNodes: [], roadmapEdges: [], courses: [], courseSections: [], lessons: [], lessonProgress: [], goalReviews: [],
    notes: [], preferences: defaultPreferences,
  };
}
