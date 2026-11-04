import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthState, CollectionName, Preferences, Workspace } from '../../shared/types';
import { ApiError, api } from '../lib/api';
import { emptyWorkspace } from '../lib/defaults';

interface WorkspaceContextValue {
  auth: AuthState;
  workspace: Workspace;
  workspaceLoading: boolean;
  workspaceError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  createRecord: <K extends CollectionName>(collection: K, record: Workspace[K] extends Array<infer T> ? T : never) => Promise<void>;
  updateRecord: <K extends CollectionName>(collection: K, record: Workspace[K] extends Array<infer T> ? T : never, id: string) => Promise<void>;
  deleteRecord: (collection: CollectionName, id: string) => Promise<void>;
  savePreferences: (preferences: Preferences) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ user: null, csrfToken: null, loading: true, error: null });
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const csrfRef = useRef<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const data = await api.getWorkspace();
      setWorkspace({ ...emptyWorkspace(), ...data });
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Your workspace could not be loaded.');
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setAuth((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await api.getAuth();
      csrfRef.current = response.csrfToken;
      setAuth({ user: response.user, csrfToken: response.csrfToken, loading: false, error: null });
      await loadWorkspace();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      csrfRef.current = null;
      setWorkspace(emptyWorkspace());
      setAuth({ user: null, csrfToken: null, loading: false, error: apiError?.status === 401 ? null : (error instanceof Error ? error.message : 'Could not connect to Setlifest.') });
    }
  }, [loadWorkspace]);

  useEffect(() => { void reload(); }, [reload]);

  const signIn = useCallback(async () => {
    try {
      const url = await api.startSignIn();
      window.location.assign(url);
    } catch (error) {
      setAuth((current) => ({ ...current, error: error instanceof Error ? error.message : 'Sign-in could not start.' }));
    }
  }, []);

  const signOut = useCallback(async () => {
    const csrf = csrfRef.current;
    if (csrf) await api.signOut(csrf);
    csrfRef.current = null;
    setWorkspace(emptyWorkspace());
    setAuth({ user: null, csrfToken: null, loading: false, error: null });
  }, []);

  const createRecord = useCallback(async <K extends CollectionName>(collection: K, record: Workspace[K] extends Array<infer T> ? T : never) => {
    const saved = await api.create(collection, record, csrfRef.current ?? '');
    setWorkspace((current) => ({ ...current, [collection]: [...current[collection], saved] }));
  }, []);

  const updateRecord = useCallback(async <K extends CollectionName>(collection: K, record: Workspace[K] extends Array<infer T> ? T : never, id: string) => {
    const saved = await api.update(collection, record, id, csrfRef.current ?? '');
    setWorkspace((current) => ({ ...current, [collection]: current[collection].map((item) => (item as { id: string }).id === id ? saved : item) }));
  }, []);

  const deleteRecord = useCallback(async (collection: CollectionName, id: string) => {
    await api.remove(collection, id, csrfRef.current ?? '');
    await loadWorkspace();
  }, [loadWorkspace]);

  const savePreferences = useCallback(async (preferences: Preferences) => {
    const saved = await api.savePreferences(preferences, csrfRef.current ?? '');
    setWorkspace((current) => ({ ...current, preferences: saved }));
  }, []);

  const value = useMemo(() => ({ auth, workspace, workspaceLoading, workspaceError, signIn, signOut, reload, createRecord, updateRecord, deleteRecord, savePreferences }), [auth, workspace, workspaceLoading, workspaceError, signIn, signOut, reload, createRecord, updateRecord, deleteRecord, savePreferences]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider.');
  return context;
}
