const handleActivationKey = (event, callback) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  callback(event);
};

export default function MetricCard({ label, value, detail, tone = 'bg-white', helpId, helpIcon, onClick, ariaLabel }) {
  return (
    <div
      data-help-id={helpId}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onClick ? (event) => handleActivationKey(event, onClick) : undefined}
      className={`${tone} rounded-lg border border-slate-200 p-5 shadow-sm ${onClick ? 'cursor-pointer transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : ''}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-950">{value}{helpIcon}</h3>
      {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
    </div>
  );
}
