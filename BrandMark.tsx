export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-lockup ${compact ? 'brand-compact' : ''}`}>
    <svg className="brand-symbol" viewBox="0 0 42 42" aria-hidden="true">
      <rect x="1" y="1" width="40" height="40" rx="13" fill="currentColor" />
      <path d="M12 28.5c5.2 0 8.2-2.2 9.7-6.4 1.7-4.5 4.2-7.1 8.3-8.6M13 15.2c3.2 0 5.8 1.5 7.7 4.3m-8.2 9.2c3.9-2.3 7.2-2.6 11.4-1.7 2 .4 3.7.3 5.3-.2" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="30.4" cy="13" r="2.4" fill="#f5c96d" />
      <circle cx="12.3" cy="15.2" r="2" fill="#fff" />
      <circle cx="12.3" cy="28.5" r="2" fill="#fff" />
    </svg>
    {!compact && <span className="brand-wordmark">setlifest<span>.</span></span>}
  </span>;
}
