import { useCallback, useEffect, useState } from 'react';
import {
  bootstrapSharedBackendFromCurrentCache,
  exportSharedBackendDataset,
  getBackendAdminSnapshot,
} from '../../services/backendAdminService';

const StatusPill = ({ children, tone = 'slate' }) => {
  const tones = {
    green: 'border-green-200 bg-green-50 text-green-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
};

export default function BackendAdminPanel({ open, onClose }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage('');
    const next = await getBackendAdminSnapshot();
    setSnapshot(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  const health = snapshot?.health;
  const counts = health?.status?.counts || {};
  const issues = snapshot?.qualityIssues || [];

  const handleBootstrap = async () => {
    if (!window.confirm('Bootstrap the empty shared backend from the current local dashboard cache? Existing shared jobs will not be overwritten.')) return;
    setLoading(true);
    const result = await bootstrapSharedBackendFromCurrentCache();
    setMessage(result.bootstrapped
      ? 'Shared backend bootstrap completed.'
      : `Bootstrap did not run: ${result.reason || 'unknown reason'}.`);
    await refresh();
  };

  const handleExport = async () => {
    setLoading(true);
    setMessage('');
    try {
      await exportSharedBackendDataset();
      setMessage('Validated shared dataset exported.');
    } catch (error) {
      setMessage(error.message || 'Shared dataset export failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Backend administration">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Phase 4 administration</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Shared Backend Status</h2>
            <p className="mt-1 text-sm text-slate-600">Configuration, record counts, validation issues, bootstrap, and backup export.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
            Close
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-wrap gap-2">
            <StatusPill>Provider: {snapshot?.provider || 'checking'}</StatusPill>
            <StatusPill tone={health?.available ? 'green' : 'amber'}>
              {health?.available ? 'Backend available' : 'Backend unavailable'}
            </StatusPill>
            <StatusPill tone={health?.authenticated ? 'green' : 'amber'}>
              {health?.authenticated ? 'Authenticated' : 'Authentication required'}
            </StatusPill>
            <StatusPill tone={issues.some((item) => item.severity === 'error') ? 'red' : issues.length ? 'amber' : 'green'}>
              {issues.length} quality issues
            </StatusPill>
          </div>

          {snapshot?.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {snapshot.error.message || 'Unable to read backend status.'}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">{message}</div>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">Record Counts</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={loading} onClick={refresh} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Refresh
                </button>
                <button type="button" disabled={loading || !health?.available} onClick={handleBootstrap} className="rounded-lg border border-blue-700 bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                  Bootstrap Empty Backend
                </button>
                <button type="button" disabled={loading || !health?.available} onClick={handleExport} className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                  Export Backend JSON
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(counts).map(([collection, count]) => (
                <div key={collection} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{collection.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{count}</p>
                </div>
              ))}
              {!Object.keys(counts).length && (
                <p className="col-span-full text-sm text-slate-500">No shared counts are available yet.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-black text-slate-950">Data Quality Review</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Record</th>
                    <th className="px-4 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {issues.map((issue, index) => (
                    <tr key={`${issue.issue_type}-${issue.entity_id}-${index}`}>
                      <td className="px-4 py-3 font-bold">{issue.severity}</td>
                      <td className="px-4 py-3">{issue.issue_type}</td>
                      <td className="px-4 py-3">{issue.entity_id || '-'}</td>
                      <td className="px-4 py-3">{issue.detail}</td>
                    </tr>
                  ))}
                  {!issues.length && (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-slate-500">No data-quality issues were returned.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
