export function Loading() { return <div className="loading-state"><div className="spinner-border text-primary" role="status"/><span>Loading data…</span></div>; }
export function ErrorBox({ message }) { return message ? <div className="alert alert-danger py-2">{message}</div> : null; }
export function EmptyState({ icon='bi-inbox', title='Nothing here yet', text='Add your first record to get started.' }) {
  return <div className="empty-state"><i className={`bi ${icon}`}/><strong>{title}</strong><span>{text}</span></div>;
}
export function StatusBadge({ status }) {
  const cls = String(status || '').toLowerCase().replace(/\s/g,'-');
  return <span className={`status-badge status-${cls}`}>{status || 'Unknown'}</span>;
}
export function money(value) {
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value)||0);
}
export function dateShort(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
export function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
