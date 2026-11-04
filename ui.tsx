import { useEffect, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; size?: 'sm' | 'md' | 'lg' }) {
  return <button type={type} className={`button button-${variant} button-${size} ${className}`} {...props} />;
}

export function IconButton({ label, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} className={`icon-button ${className}`} {...props}>{children}</button>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`surface-card ${className}`}>{children}</section>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ProgressBar({ value, label, color }: { value: number; label?: string; color?: string }) {
  const normalized = Math.max(0, Math.min(100, value));
  return <div className="progress-track" role="progressbar" aria-valuenow={normalized} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'}>
    <span className="progress-fill" style={{ width: `${normalized}%`, ...(color ? { '--progress-color': color } as CSSProperties : {}) }} />
  </div>;
}

export function Field({ label, hint, error, className = '', id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label className={`field ${className}`} htmlFor={fieldId}>
    <span className="field-label">{label}</span>
    <input id={fieldId} className="input" aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined} {...props} />
    {hint && !error && <span id={`${fieldId}-hint`} className="field-hint">{hint}</span>}
    {error && <span id={`${fieldId}-error`} className="field-error">{error}</span>}
  </label>;
}

export function SelectField({ label, children, className = '', id, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label className={`field ${className}`} htmlFor={fieldId}>
    <span className="field-label">{label}</span>
    <select id={fieldId} className="input select-input" {...props}>{children}</select>
  </label>;
}

export function TextAreaField({ label, className = '', id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label className={`field ${className}`} htmlFor={fieldId}>
    <span className="field-label">{label}</span>
    <textarea id={fieldId} className="input textarea-input" {...props} />
  </label>;
}

export function Switch({ checked, onChange, label, description, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`switch ${checked ? 'switch-on' : ''}`} onClick={() => onChange(!checked)}>
    <span className="switch-copy"><strong>{label}</strong>{description && <small>{description}</small>}</span>
    <span className="switch-track"><span /></span>
  </button>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-heading">
    <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>
    {action && <div className="page-heading-action">{action}</div>}
  </header>;
}

export function Modal({ open, title, description, onClose, children, size = 'md' }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? 'modal-description' : undefined}>
      <header className="modal-header"><div><h2 id="modal-title">{title}</h2>{description && <p id="modal-description">{description}</p>}</div><IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton></header>
      {children}
    </section>
  </div>;
}
