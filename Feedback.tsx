import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, Check, Info, LoaderCircle, X } from 'lucide-react';
import { Button } from './ui';

export function LoadingScreen({ label }: { label: string }) {
  return <main className="loading-screen"><div className="loader-mark"><LoaderCircle size={24} /></div><p>{label}</p><span className="loading-line" /></main>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="error-banner" role="alert"><AlertCircle size={18} /><span>{message}</span>{onRetry && <Button variant="quiet" size="sm" onClick={onRetry}>Retry</Button>}</div>;
}

type ToastTone = 'success' | 'error' | 'info';
interface ToastEntry { id: number; message: string; tone: ToastTone; }
interface ToastContextValue { notify: (message: string, tone?: ToastTone) => void; }
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastEntry[]>([]);
  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3800);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite" aria-atomic="false">
    {items.map((item) => <Toast key={item.id} item={item} onDismiss={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} />)}
  </div></ToastContext.Provider>;
}

function Toast({ item, onDismiss }: { item: ToastEntry; onDismiss: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onDismiss, 3800); return () => window.clearTimeout(timer); }, [onDismiss]);
  const Icon = item.tone === 'success' ? Check : item.tone === 'error' ? AlertCircle : Info;
  return <div className={`toast toast-${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'}><Icon size={17} /><span>{item.message}</span><button type="button" aria-label="Dismiss notification" onClick={onDismiss}><X size={15} /></button></div>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider.');
  return context;
}
