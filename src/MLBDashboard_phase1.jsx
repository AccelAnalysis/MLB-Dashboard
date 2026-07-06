import React, { useEffect, useMemo, useState } from 'react';
import MLBDashboard from './MLBDashboard_field_complete.jsx';
import { STORAGE_KEY, normalizeProjects, saveProjects } from './services/projectStorage';

const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v) || 0);
const num = (v) => Number(v) || 0;
const hasValue = (v) => v !== undefined && v !== null && v !== '';
const today = () => new Date().toISOString().split('T')[0];

const loadStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeProjects(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

const isBookedChange = (co) => !['pending', 'rejected'].includes(co.status || 'approved');
const changeTotal = (project, scopeId = null) => (project.changeOrders || [])
  .filter(isBookedChange)
  .filter((co) => (scopeId ? co.scopeId === scopeId : true))
  .reduce((sum, co) => sum + num(co.amount), 0);
const pendingTotal = (project) => (project.changeOrders || [])
  .filter((co) => (co.status || 'approved') === 'pending')
  .reduce((sum, co) => sum + num(co.amount), 0);
const projectFinal = (project) => (hasValue(project.finalAmount) ? num(project.finalAmount) : num(project.originalAmount) + changeTotal(project));
const projectChange = (project) => projectFinal(project) - num(project.originalAmount);
const scopeFinal = (project, scope) => (hasValue(scope.finalAmount) ? num(scope.finalAmount) : num(scope.initialAmount) + changeTotal(project, scope.id));
const scopeChange = (project, scope) => scopeFinal(project, scope) - num(scope.initialAmount);
const pct = (change, base) => (base ? `${((change / base) * 100).toFixed(1)}%` : '0.0%');

const blankDraft = (project) => ({ date: today(), scopeId: project.scopes?.[0]?.id || '', description: '', amount: '', status: 'approved' });

function SmallMetric({ label, value, note }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
      {note && <p className="text-xs font-semibold text-slate-500">{note}</p>}
    </div>
  );
}

function ChangeBadge({ change, base }) {
  const tone = change > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : change < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200';
  return <span className={`rounded-full border px-2 py-1 text-xs font-black ${tone}`}>{change >= 0 ? '+' : ''}{money(change)} / {change >= 0 ? '+' : ''}{pct(change, base)}</span>;
}

function Phase1FinancialPanel({ onDataChanged }) {
  const [projects, setProjects] = useState(loadStored);
  const [open, setOpen] = useState(true);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    const refresh = () => setProjects(loadStored());
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const active = useMemo(() => projects.filter((p) => !p.cancelled), [projects]);
  const metrics = useMemo(() => {
    const initial = active.reduce((sum, p) => sum + num(p.originalAmount), 0);
    const final = active.reduce((sum, p) => sum + projectFinal(p), 0);
    const change = final - initial;
    const pending = active.reduce((sum, p) => sum + pendingTotal(p), 0);
    const changedJobs = active.filter((p) => Math.abs(projectChange(p)) > 0 || (p.changeOrders || []).length > 0).length;
    return { initial, final, change, pending, changedJobs, avg: active.length ? Math.round(change / active.length) : 0 };
  }, [active]);

  const persist = (next) => {
    const normalized = normalizeProjects(next);
    saveProjects(normalized);
    setProjects(normalized);
    onDataChanged();
  };

  const setProject = (id, field, value) => persist(projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  const setScope = (projectId, scopeId, field, value) => persist(projects.map((p) => (
    p.id === projectId ? { ...p, scopes: p.scopes.map((s) => (s.id === scopeId ? { ...s, [field]: value } : s)) } : p
  )));
  const setDraft = (project, field, value) => setDrafts((current) => ({ ...current, [project.id]: { ...(current[project.id] || blankDraft(project)), [field]: value } }));

  const addChangeOrder = (project) => {
    const draft = drafts[project.id] || blankDraft(project);
    if (!draft.amount || !draft.description.trim()) return;
    persist(projects.map((p) => (p.id === project.id ? {
      ...p,
      changeOrders: [...(p.changeOrders || []), { ...draft, id: Date.now(), amount: Number(draft.amount), reason: draft.description.trim(), description: draft.description.trim() }],
    } : p)));
    setDrafts((current) => ({ ...current, [project.id]: blankDraft(project) }));
  };

  return (
    <section className="border-b border-slate-200 bg-slate-100 print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Phase 1 financial tracking</p>
            <h1 className="text-xl font-black text-slate-950">Initial contract vs. final project amount</h1>
            <p className="text-sm text-slate-600">Manual layer for real end-of-project figures, approved change orders, and scope-level variance.</p>
          </div>
          <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">{open ? 'Hide tracker' : 'Show tracker'}</button>
        </div>

        {open && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <SmallMetric label="Initial Contract" value={money(metrics.initial)} note="Sold baseline" />
              <SmallMetric label="Final / Current" value={money(metrics.final)} note="Actual or calculated" />
              <SmallMetric label="Net Change" value={`${metrics.change >= 0 ? '+' : ''}${money(metrics.change)}`} note={pct(metrics.change, metrics.initial)} />
              <SmallMetric label="Pending COs" value={money(metrics.pending)} note="Not booked yet" />
              <SmallMetric label="Changed Jobs" value={`${metrics.changedJobs}/${active.length}`} note="CO or variance" />
              <SmallMetric label="Avg Change" value={`${metrics.avg >= 0 ? '+' : ''}${money(metrics.avg)}`} note="Per active job" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-500">
                <strong className="text-slate-700">Manual project and scope financials.</strong> Leave Final Project Amount blank to calculate Initial Contract + approved/invoiced/collected change orders.
              </div>
              <div className="max-h-[560px] overflow-auto">
                {active.map((project) => {
                  const draft = drafts[project.id] || blankDraft(project);
                  const change = projectChange(project);
                  return (
                    <details key={project.id} open={Math.abs(change) > 0 || hasValue(project.finalAmount)} className="border-b border-slate-100 last:border-b-0">
                      <summary className="grid cursor-pointer grid-cols-1 gap-3 px-4 py-4 hover:bg-slate-50 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr] lg:items-center">
                        <div><p className="font-black text-slate-900">{project.customer || project.id}</p><p className="text-xs font-semibold text-slate-500">{project.salesperson || 'Unassigned'} · {project.city || 'No city'} · {project.scopes?.length || 0} scope(s)</p></div>
                        <div><p className="text-[11px] font-black uppercase text-slate-400">Initial</p><p className="font-black">{money(project.originalAmount)}</p></div>
                        <div><p className="text-[11px] font-black uppercase text-slate-400">Booked COs</p><p className="font-black">{money(changeTotal(project))}</p></div>
                        <div><p className="text-[11px] font-black uppercase text-slate-400">Final</p><p className="font-black">{money(projectFinal(project))}</p></div>
                        <ChangeBadge change={change} base={num(project.originalAmount)} />
                      </summary>

                      <div className="space-y-3 bg-slate-50 px-4 pb-5">
                        <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4">
                          <label className="text-xs font-black uppercase text-slate-500">Initial Contract<input type="number" value={project.originalAmount ?? ''} onChange={(e) => setProject(project.id, 'originalAmount', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" /></label>
                          <label className="text-xs font-black uppercase text-slate-500">Final Project Amount<input type="number" value={project.finalAmount ?? ''} onChange={(e) => setProject(project.id, 'finalAmount', e.target.value)} placeholder="Auto" className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" /></label>
                          <label className="text-xs font-black uppercase text-slate-500">Financial Close Date<input type="date" value={project.financialCloseDate || ''} onChange={(e) => setProject(project.id, 'financialCloseDate', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" /></label>
                          <label className="text-xs font-black uppercase text-slate-500">Financial Notes<input type="text" value={project.financialNotes || ''} onChange={(e) => setProject(project.id, 'financialNotes', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" /></label>
                        </div>

                        {(project.scopes || []).map((scope) => (
                          <div key={scope.id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_1fr] md:items-center">
                            <div><p className="font-black text-slate-800">{scope.type}</p><p className="text-xs text-slate-500">{scope.crew || 'No crew'} · {scope.completionDate ? `Completed ${scope.completionDate}` : 'Open scope'}</p></div>
                            <label className="text-[11px] font-black uppercase text-slate-500">Scope Initial<input type="number" value={scope.initialAmount ?? ''} onChange={(e) => setScope(project.id, scope.id, 'initialAmount', e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-1.5 text-sm" /></label>
                            <label className="text-[11px] font-black uppercase text-slate-500">Scope Final<input type="number" value={scope.finalAmount ?? ''} onChange={(e) => setScope(project.id, scope.id, 'finalAmount', e.target.value)} placeholder="Auto" className="mt-1 w-full rounded border border-slate-300 p-1.5 text-sm" /></label>
                            <p className="text-sm font-black text-slate-700">COs: {money(changeTotal(project, scope.id))}</p>
                            <ChangeBadge change={scopeChange(project, scope)} base={num(scope.initialAmount)} />
                          </div>
                        ))}

                        <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 lg:grid-cols-[0.75fr_1fr_1.25fr_0.7fr_0.7fr_auto] lg:items-end">
                          <label className="text-xs font-black uppercase text-slate-500">Date<input type="date" value={draft.date} onChange={(e) => setDraft(project, 'date', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" /></label>
                          <label className="text-xs font-black uppercase text-slate-500">Scope<select value={draft.scopeId} onChange={(e) => setDraft(project, 'scopeId', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"><option value="">Project-level</option>{(project.scopes || []).map((s) => <option key={s.id} value={s.id}>{s.type}</option>)}</select></label>
                          <label className="text-xs font-black uppercase text-slate-500">Reason<input type="text" value={draft.description} onChange={(e) => setDraft(project, 'description', e.target.value)} placeholder="Bad wood, add-on, scope correction..." className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" /></label>
                          <label className="text-xs font-black uppercase text-slate-500">Amount<input type="number" value={draft.amount} onChange={(e) => setDraft(project, 'amount', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm" /></label>
                          <label className="text-xs font-black uppercase text-slate-500">Status<select value={draft.status} onChange={(e) => setDraft(project, 'status', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"><option>pending</option><option>approved</option><option>invoiced</option><option>collected</option><option>rejected</option></select></label>
                          <button type="button" onClick={() => addChangeOrder(project)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Add CO</button>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function MLBDashboardPhase1() {
  const [revision, setRevision] = useState(0);
  return <><Phase1FinancialPanel onDataChanged={() => setRevision((value) => value + 1)} /><MLBDashboard key={revision} /></>;
}
