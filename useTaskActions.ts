import { useCallback } from 'react';
import type { Task } from '../../../shared/types';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useToast } from '../../components/Feedback';
import { nextRecurrenceDate, taskStatusTransition } from '../../lib/calculations';
import { ApiError } from '../../lib/api';
import { recurringTaskId } from '../../lib/format';

export function useTaskActions() {
  const { workspace, updateRecord, createRecord, reload } = useWorkspace();
  const { notify } = useToast();
  const completeTask = useCallback(async (task: Task) => {
    if (task.status === 'done') return;
    try {
      const completed = taskStatusTransition(task, true);
      const nextDate = nextRecurrenceDate(task);
      if (nextDate) {
        const nextId = await recurringTaskId(task.id, nextDate);
        if (!workspace.tasks.some((item) => item.id === nextId)) {
          try {
            await createRecord('tasks', { ...task, id: nextId, status: 'todo', dueDate: nextDate, startDate: nextDate, completedAt: null, createdAt: new Date().toISOString() });
          } catch (error) {
            if (!(error instanceof ApiError && error.status === 409 && error.message === 'That record already exists.')) throw error;
            await reload();
          }
        }
      }
      await updateRecord('tasks', completed, task.id);
      const linked = workspace.roadmapNodes.filter((node) => node.taskId === task.id && node.status !== 'complete');
      await Promise.all(linked.map((node) => updateRecord('roadmapNodes', { ...node, status: 'complete', progress: 100 }, node.id)));
      notify(nextDate ? 'Task complete. Its next occurrence is on the way.' : 'Task complete.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not complete this task.', 'error'); }
  }, [workspace.tasks, workspace.roadmapNodes, updateRecord, createRecord, reload, notify]);
  const reopenTask = useCallback(async (task: Task) => {
    try {
      await updateRecord('tasks', taskStatusTransition(task, false), task.id);
      const linked = workspace.roadmapNodes.filter((node) => node.taskId === task.id && node.status === 'complete');
      await Promise.all(linked.map((node) => updateRecord('roadmapNodes', { ...node, status: 'active', progress: Math.min(node.progress, 99) }, node.id)));
      notify('Task reopened.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not reopen this task.', 'error'); }
  }, [workspace.roadmapNodes, updateRecord, notify]);
  return { completeTask, reopenTask };
}
