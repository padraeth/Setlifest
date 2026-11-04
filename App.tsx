import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { WorkspaceProvider, useWorkspace } from '../state/WorkspaceContext';
import { AuthScreen } from './AuthScreen';
import { AppShell } from './AppShell';
import { LoadingScreen, ToastProvider } from '../components/Feedback';

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const HabitsPage = lazy(() => import('../features/habits/HabitsPage').then((module) => ({ default: module.HabitsPage })));
const TasksPage = lazy(() => import('../features/tasks/TasksPage').then((module) => ({ default: module.TasksPage })));
const GoalsPage = lazy(() => import('../features/goals/GoalsPage').then((module) => ({ default: module.GoalsPage })));
const RoadmapPage = lazy(() => import('../features/roadmaps/RoadmapPage').then((module) => ({ default: module.RoadmapPage })));
const CoursesPage = lazy(() => import('../features/courses/CoursesPage').then((module) => ({ default: module.CoursesPage })));
const CourseDetailPage = lazy(() => import('../features/courses/CourseDetailPage').then((module) => ({ default: module.CourseDetailPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));

function ApplicationRoutes() {
  const { auth, workspaceLoading, workspaceError, reload } = useWorkspace();
  if (auth.loading) return <LoadingScreen label="Opening your workspace" />;
  if (!auth.user) return <AuthScreen />;
  if (workspaceLoading) return <LoadingScreen label="Gathering your plans" />;
  return <AppShell workspaceError={workspaceError} onRetry={() => void reload()}>
    <Suspense fallback={<LoadingScreen label="Opening this section" />}><Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/habits" element={<HabitsPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/goals" element={<GoalsPage />} />
      <Route path="/roadmap" element={<RoadmapPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  </AppShell>;
}

export function App() {
  return <MotionConfig reducedMotion="user"><ToastProvider><WorkspaceProvider><BrowserRouter><ApplicationRoutes /></BrowserRouter></WorkspaceProvider></ToastProvider></MotionConfig>;
}
