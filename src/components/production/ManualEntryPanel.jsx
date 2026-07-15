import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import {
  CHANGE_ORDER_STATUS,
  LEAD_STATUS,
  PAYMENT_STATUS,
  PRODUCTION_STAGE,
} from '../../domain/enums';
import {
  calculateManualEntryFinancials,
  createEmptyManualChangeOrder,
  createEmptyManualEntryDraft,
  createEmptyManualScope,
  createManualEntryDraftFromDataset,
  MANUAL_ENTRY_PRODUCT_CATEGORIES,
  MANUAL_ENTRY_REGIONS,
  MANUAL_ENTRY_TABS,
  validateManualEntryDraft,
} from '../../domain/manualEntry';
import {
  canUseManualEntry,
  loadManualEntryWorkspace,
  saveManualEntryDraft,
} from '../../services/manualEntryService';

const stageLabel = (value) => String(value || '')
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const currency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const dateLabel = (value) => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US');
};

const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'text-xs font-black uppercase tracking-wide text-slate-600';

const Field = ({ label, children, className = '' }) => (
  <label className={`${labelClass} ${className}`}>
    {label}
    {children}
  </label>
);

const Section = ({ icon: Icon, title, description, locked = false, children }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
      <div className="flex items-start gap-3">
        {Icon && <Icon className="mt-0.5 text-blue-700" size={22} />}
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
      </div>
      {locked && <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">Read only for your role</span>}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const Toggle = ({ label, checked, onChange, disabled = false }) => (
  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
    {label}
  </label>
);

const productionStages = Object.values(PRODUCTION_STAGE);
const paymentStatuses = Object.values(PAYMENT_STATUS);
const leadStatuses = Object.values(LEAD_STATUS);
const changeOrderStatuses = Object.values(CHANGE_ORDER_STATUS);

const ValidationNotice = ({ validation }) => {
  if (!validation.errors.length && !validation.warnings.length) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
        <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
        The record passes Phase 6 entry validation.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {validation.errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-black">Resolve before saving</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{validation.errors.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-black">Review recommended</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{validation.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
    </div>
  );
};

export default function ManualEntryPanel({
  open,
  onClose,
  profile,
  capabilities = {},
  onSaved = () => {},
}) {
  const [workspace, setWorkspace] = useState(null);
  const [draft, setDraft] = useState(null);
  const [activeTab, setActiveTab] = useState('customer');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const permissions = useMemo(() => ({
    canCreate: Boolean(capabilities.createProjects),
    canEditSales: Boolean(capabilities.manageSalesData || capabilities.manageBusinessData),
    canEditProduction: Boolean(capabilities.manageProductionData || capabilities.manageBusinessData),
    canEditFinancial: Boolean(capabilities.manageFinancialData || capabilities.manageBusinessData),
  }), [capabilities]);

  const allowed = canUseManualEntry(capabilities);

  const refresh = async (preferredJobId = selectedJobId) => {
    setLoading(true);
    setError('');
    try {
      const next = await loadManualEntryWorkspace();
      setWorkspace(next);
      if (preferredJobId) {
        const nextDraft = createManualEntryDraftFromDataset(next.dataset, preferredJobId);
        if (nextDraft) {
          setSelectedJobId(preferredJobId);
          setDraft(nextDraft);
        }
      }
    } catch (nextError) {
      setError(nextError.message || 'Unable to load Critical Path entry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !allowed) return;
    refresh('');
  }, [open, allowed]);

  const filteredJobs = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return workspace?.jobs || [];
    return (workspace?.jobs || []).filter((job) => [
      job.customerName,
      job.city,
      job.region,
      job.soldDate,
      job.productionStage,
      ...(job.scopeCategories || []),
    ].join(' ').toLowerCase().includes(normalized));
  }, [workspace?.jobs, search]);

  if (!open) return null;

  if (!allowed) {
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/75 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="text-xl font-black text-slate-950">Critical Path entry unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">Your role can review dashboard records but does not have a manual-entry permission.</p>
          <button type="button" onClick={onClose} className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Close</button>
        </div>
      </div>
    );
  }

  const validation = draft
    ? validateManualEntryDraft(draft, { isNew: draft.mode === 'new', canCreate: permissions.canCreate })
    : null;
  const financials = draft ? calculateManualEntryFinancials(draft) : null;
  const teamMembers = workspace?.teamMembers || [];
  const salespeople = teamMembers.filter((member) => member.salesperson);
  const productionStaff = teamMembers.filter((member) => member.productionStaff);
  const crews = workspace?.crews || [];
  const isNew = draft?.mode === 'new';

  const selectJob = (jobId) => {
    const nextDraft = createManualEntryDraftFromDataset(workspace.dataset, jobId);
    setSelectedJobId(jobId);
    setDraft(nextDraft);
    setActiveTab('customer');
    setMessage('');
    setError('');
  };

  const startNew = () => {
    setSelectedJobId('');
    setDraft(createEmptyManualEntryDraft(profile));
    setActiveTab('customer');
    setMessage('');
    setError('');
  };

  const updateCustomer = (field, value) => setDraft((current) => ({
    ...current,
    customer: { ...current.customer, [field]: value },
  }));
  const updateAddress = (field, value) => setDraft((current) => ({
    ...current,
    customer: {
      ...current.customer,
      address: { ...current.customer.address, [field]: value },
    },
  }));
  const updateLead = (field, value) => setDraft((current) => ({
    ...current,
    lead: { ...current.lead, [field]: value },
  }));
  const updateJob = (field, value) => setDraft((current) => ({
    ...current,
    job: { ...current.job, [field]: value },
  }));
  const updateIntake = (field, value) => setDraft((current) => ({
    ...current,
    job: { ...current.job, intake: { ...current.job.intake, [field]: value } },
  }));
  const updatePermit = (field, value) => setDraft((current) => ({
    ...current,
    job: { ...current.job, permit: { ...current.job.permit, [field]: value } },
  }));

  const addScope = () => setDraft((current) => ({
    ...current,
    scopes: [...current.scopes, createEmptyManualScope()],
  }));
  const updateScope = (index, field, value) => setDraft((current) => ({
    ...current,
    scopes: current.scopes.map((scope, scopeIndex) => (
      scopeIndex === index ? { ...scope, [field]: value } : scope
    )),
  }));
  const updateScopeDate = (index, field, value) => setDraft((current) => ({
    ...current,
    scopes: current.scopes.map((scope, scopeIndex) => (
      scopeIndex === index ? { ...scope, dates: { ...scope.dates, [field]: value } } : scope
    )),
  }));
  const removeScope = (index) => setDraft((current) => ({
    ...current,
    scopes: current.scopes.flatMap((scope, scopeIndex) => {
      if (scopeIndex !== index) return [scope];
      return scope.existing ? [{ ...scope, removed: !scope.removed }] : [];
    }),
  }));

  const addChangeOrder = () => setDraft((current) => ({
    ...current,
    changeOrders: [...current.changeOrders, createEmptyManualChangeOrder()],
  }));
  const updateChangeOrder = (index, field, value) => setDraft((current) => ({
    ...current,
    changeOrders: current.changeOrders.map((record, recordIndex) => (
      recordIndex === index ? { ...record, [field]: value } : record
    )),
  }));
  const removeChangeOrder = (index) => setDraft((current) => ({
    ...current,
    changeOrders: current.changeOrders.flatMap((record, recordIndex) => {
      if (recordIndex !== index) return [record];
      return record.existing ? [{ ...record, removed: !record.removed }] : [];
    }),
  }));

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await saveManualEntryDraft({ draft, profile, capabilities });
      if (!result.saved && result.reason === 'NO_CHANGES') {
        setMessage('No changes were detected.');
        return;
      }
      setWorkspace((current) => ({
        ...current,
        dataset: result.dataset,
        jobs: result.jobs,
      }));
      setSelectedJobId(result.jobId);
      setDraft(createManualEntryDraftFromDataset(result.dataset, result.jobId));
      setMessage(`Critical Path record saved. Updated: ${result.collections.join(', ')}.`);
      onSaved(result);
    } catch (nextError) {
      const detailErrors = nextError.details?.errors || nextError.details?.validation?.errors;
      setError(detailErrors?.length ? detailErrors.join(' ') : nextError.message || 'Unable to save the Critical Path record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/80 p-2 sm:p-4 print:hidden">
      <div className="mx-auto flex h-full max-w-[1900px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-100 shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 bg-slate-950 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-blue-300" size={28} />
            <div>
              <h2 className="text-2xl font-black">Critical Path Entry</h2>
              <p className="text-sm font-semibold text-slate-300">Manual-first customer, sold job, work-scope, and closeout record maintenance.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-200">{workspace?.provider || 'Loading'} provider</span>
            <button type="button" onClick={() => refresh(selectedJobId)} disabled={loading} className="rounded-lg border border-slate-600 bg-slate-900 p-2 hover:bg-slate-800 disabled:opacity-50" aria-label="Refresh Critical Path records">
              <RefreshCw size={19} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-600 bg-slate-900 p-2 hover:bg-slate-800" aria-label="Close Critical Path entry"><X size={20} /></button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-slate-300 bg-white lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-slate-200 p-4">
              {permissions.canCreate && (
                <button type="button" onClick={startNew} className="flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800">
                  <Plus className="mr-2" size={18} /> New sold job
                </button>
              )}
              <label className="relative block">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Customer, city, scope, stage…" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {loading && !workspace && <div className="flex items-center justify-center py-10 text-sm font-bold text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Loading records…</div>}
              <div className="space-y-2">
                {filteredJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => selectJob(job.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${selectedJobId === job.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-slate-950">{job.customerName}</p>
                        <p className="text-xs font-semibold text-slate-500">{job.city || job.region} · Sold {dateLabel(job.soldDate)}</p>
                      </div>
                      <ChevronRight className="mt-1 shrink-0 text-slate-400" size={17} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className={`rounded px-2 py-1 text-[10px] font-black uppercase ${job.cancelled ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>{stageLabel(job.productionStage)}</span>
                      <span className="rounded bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-800">{job.scopeCount} scope{job.scopeCount === 1 ? '' : 's'}</span>
                    </div>
                    {job.decisionNeeded && <p className="mt-2 line-clamp-2 text-xs font-bold text-amber-800">Decision: {job.decisionNeeded}</p>}
                  </button>
                ))}
                {!loading && filteredJobs.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm font-semibold text-slate-500">No matching jobs.</p>}
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col">
            {!draft ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="max-w-xl text-center">
                  <BookOpenCheck className="mx-auto text-blue-700" size={56} />
                  <h3 className="mt-5 text-2xl font-black text-slate-950">Select a Critical Path record</h3>
                  <p className="mt-2 text-slate-600">Choose an existing sold job to maintain it, or create a new sold job when your role permits.</p>
                  {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p>}
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 bg-white px-5 pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{isNew ? 'New sold job' : draft.ids.jobId}</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-950">{draft.customer.displayName || 'Unnamed customer'}</h3>
                      <p className="text-sm font-semibold text-slate-500">{draft.job.locationName || draft.customer.address.city || 'Location not entered'} · {stageLabel(draft.job.productionStage)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Effective final amount</p>
                      <p className="text-2xl font-black text-slate-950">{currency(financials.effectiveFinalAmount)}</p>
                    </div>
                  </div>
                  <nav className="flex gap-2 overflow-x-auto" aria-label="Critical Path entry sections">
                    {MANUAL_ENTRY_TABS.map((tab) => (
                      <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap border-b-4 px-4 py-3 text-sm font-black ${activeTab === tab.id ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{tab.label}</button>
                    ))}
                  </nav>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                  <div className="mx-auto max-w-7xl space-y-5">
                    {(message || error) && (
                      <div className={`rounded-xl border p-4 text-sm font-bold ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>{error || message}</div>
                    )}

                    {activeTab === 'customer' && (
                      <>
                        <Section icon={UserRound} title="Customer record" description="Identity and contact information used across every job and report." locked={!permissions.canEditSales && !isNew}>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Field label="Customer / company name" className="xl:col-span-2"><input required value={draft.customer.displayName} onChange={(event) => updateCustomer('displayName', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="First name"><input value={draft.customer.firstName} onChange={(event) => updateCustomer('firstName', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Last name"><input value={draft.customer.lastName} onChange={(event) => updateCustomer('lastName', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Phone"><input type="tel" value={draft.customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Alternate phone"><input type="tel" value={draft.customer.alternatePhone} onChange={(event) => updateCustomer('alternatePhone', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Email"><input type="email" value={draft.customer.email} onChange={(event) => updateCustomer('email', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Preferred contact"><select value={draft.customer.preferredContactMethod} onChange={(event) => updateCustomer('preferredContactMethod', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass}><option>Phone</option><option>Email</option><option>Text</option></select></Field>
                            <Field label="Street address" className="md:col-span-2"><input value={draft.customer.address.line1} onChange={(event) => updateAddress('line1', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="City"><input value={draft.customer.address.city} onChange={(event) => { updateAddress('city', event.target.value); if (!draft.job.locationName) updateJob('locationName', event.target.value); }} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="County"><input value={draft.customer.address.county} onChange={(event) => updateAddress('county', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="State"><input value={draft.customer.address.state} onChange={(event) => updateAddress('state', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Postal code"><input value={draft.customer.address.postalCode} onChange={(event) => updateAddress('postalCode', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Customer notes" className="md:col-span-2 xl:col-span-4"><textarea value={draft.customer.notes} onChange={(event) => updateCustomer('notes', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={`${fieldClass} min-h-24`} /></Field>
                          </div>
                        </Section>

                        <Section icon={ClipboardList} title="Sale and lead attribution" description="Date sold, salesperson, region, and lead source drive scorecards and reporting." locked={!permissions.canEditSales && !isNew}>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Field label="Date sold"><input type="date" value={draft.job.soldDate} onChange={(event) => updateJob('soldDate', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Region"><select value={draft.job.region} onChange={(event) => updateJob('region', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass}>{MANUAL_ENTRY_REGIONS.map((region) => <option key={region}>{region}</option>)}</select></Field>
                            <Field label="Job city / location"><input value={draft.job.locationName} onChange={(event) => updateJob('locationName', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Salesperson"><select value={draft.job.salespersonId} onChange={(event) => { updateJob('salespersonId', event.target.value); updateLead('assignedSalespersonId', event.target.value); }} disabled={!permissions.canEditSales && !isNew} className={fieldClass}><option value="">Unassigned</option>{salespeople.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></Field>
                            <Field label="Lead source"><input value={draft.lead.source} onChange={(event) => updateLead('source', event.target.value)} disabled={!permissions.canEditSales && !isNew} placeholder="Referral, Website, Angi…" className={fieldClass} /></Field>
                            <Field label="Campaign"><input value={draft.lead.campaign} onChange={(event) => updateLead('campaign', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Lead received"><input type="date" value={draft.lead.receivedAt} onChange={(event) => updateLead('receivedAt', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass} /></Field>
                            <Field label="Lead status"><select value={draft.lead.status} onChange={(event) => updateLead('status', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={fieldClass}>{leadStatuses.map((status) => <option key={status} value={status}>{stageLabel(status)}</option>)}</select></Field>
                            <Field label="Lead notes" className="md:col-span-2 xl:col-span-4"><textarea value={draft.lead.notes} onChange={(event) => updateLead('notes', event.target.value)} disabled={!permissions.canEditSales && !isNew} className={`${fieldClass} min-h-20`} /></Field>
                          </div>
                        </Section>
                      </>
                    )}

                    {activeTab === 'production' && (
                      <>
                        <Section icon={Wrench} title="Job production controls" description="Current stage, intake completion, permits, decisions, and job-level production notes." locked={!permissions.canEditProduction && !isNew}>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Field label="Job stage"><select value={draft.job.productionStage} onChange={(event) => updateJob('productionStage', event.target.value)} disabled={!permissions.canEditProduction && !isNew} className={fieldClass}>{productionStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select></Field>
                            <Field label="Decision needed" className="md:col-span-2 xl:col-span-3"><input value={draft.job.decisionNeeded} onChange={(event) => updateJob('decisionNeeded', event.target.value)} disabled={!permissions.canEditProduction && !isNew} placeholder="Decision for weekly Critical Path meeting" className={fieldClass} /></Field>
                            <div className="md:col-span-2 xl:col-span-4">
                              <p className={labelClass}>Intake checklist</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {[
                                  ['contractReceived', 'Contract received'],
                                  ['documentsUploaded', 'Documents uploaded'],
                                  ['estimateApproved', 'Estimate approved'],
                                  ['budgetCreated', 'Budget created'],
                                  ['invoiceCreated', 'Invoice created'],
                                  ['fileCreated', 'File created'],
                                ].map(([field, label]) => <Toggle key={field} label={label} checked={draft.job.intake[field]} onChange={(value) => updateIntake(field, value)} disabled={!permissions.canEditProduction && !isNew} />)}
                              </div>
                            </div>
                            <div className="md:col-span-2 xl:col-span-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-wrap items-center gap-3"><Toggle label="Permit required" checked={draft.job.permit.required} onChange={(value) => updatePermit('required', value)} disabled={!permissions.canEditProduction && !isNew} /></div>
                              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                                <Field label="Permit type"><input value={draft.job.permit.type} onChange={(event) => updatePermit('type', event.target.value)} disabled={!permissions.canEditProduction && !isNew} className={fieldClass} /></Field>
                                <Field label="Submitted"><input type="date" value={draft.job.permit.submittedAt} onChange={(event) => updatePermit('submittedAt', event.target.value)} disabled={!permissions.canEditProduction && !isNew} className={fieldClass} /></Field>
                                <Field label="Approved"><input type="date" value={draft.job.permit.approvedAt} onChange={(event) => updatePermit('approvedAt', event.target.value)} disabled={!permissions.canEditProduction && !isNew} className={fieldClass} /></Field>
                                <Field label="Permit notes" className="md:col-span-3"><textarea value={draft.job.permit.notes} onChange={(event) => updatePermit('notes', event.target.value)} disabled={!permissions.canEditProduction && !isNew} className={`${fieldClass} min-h-20`} /></Field>
                              </div>
                            </div>
                            <Field label="Production notes" className="md:col-span-2 xl:col-span-4"><textarea value={draft.job.notes} onChange={(event) => updateJob('notes', event.target.value)} disabled={!permissions.canEditProduction && !isNew} className={`${fieldClass} min-h-24`} /></Field>
                          </div>
                        </Section>

                        <Section icon={Wrench} title="Work scopes" description="One Critical Path row per trade or product category." locked={!permissions.canEditProduction && !isNew}>
                          <div className="space-y-4">
                            {draft.scopes.map((scope, index) => (
                              <article key={scope.id || `new-scope-${index}`} className={`rounded-xl border p-4 ${scope.removed ? 'border-red-200 bg-red-50 opacity-70' : 'border-slate-200 bg-white'}`}>
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">Scope {index + 1}{scope.existing ? ` · ${scope.id}` : ' · New'}</p>
                                    <h4 className="text-lg font-black text-slate-950">{scope.category || 'Uncategorized scope'}</h4>
                                  </div>
                                  <button type="button" onClick={() => removeScope(index)} disabled={!permissions.canEditProduction && !isNew} className={`rounded-lg border px-3 py-2 text-xs font-black ${scope.removed ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-white text-red-700'} disabled:opacity-50`}><Trash2 className="mr-1 inline" size={14} /> {scope.removed ? 'Restore' : 'Archive'}</button>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                  <Field label="Product category"><select value={scope.category} onChange={(event) => updateScope(index, 'category', event.target.value)} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} className={fieldClass}>{MANUAL_ENTRY_PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field>
                                  <Field label="Scope stage"><select value={scope.productionStage} onChange={(event) => updateScope(index, 'productionStage', event.target.value)} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} className={fieldClass}>{productionStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select></Field>
                                  <Field label="Priority"><select value={scope.priority} onChange={(event) => updateScope(index, 'priority', event.target.value)} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} className={fieldClass}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field>
                                  <Field label="Vendor"><input value={scope.vendor} onChange={(event) => updateScope(index, 'vendor', event.target.value)} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} className={fieldClass} /></Field>
                                  <Field label="Measurer"><select value={scope.measurerId} onChange={(event) => { const member = productionStaff.find((item) => item.id === event.target.value); updateScope(index, 'measurerId', event.target.value); updateScope(index, 'measurerName', member?.displayName || ''); }} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} className={fieldClass}><option value="">Unassigned</option>{productionStaff.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></Field>
                                  <Field label="Crew / subcontractor"><select value={scope.crewId} onChange={(event) => { const crew = crews.find((item) => item.id === event.target.value); updateScope(index, 'crewId', event.target.value); updateScope(index, 'crewName', crew?.name || ''); }} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} className={fieldClass}><option value="">Unassigned</option>{crews.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select></Field>
                                  <Field label="Description" className="md:col-span-2"><input value={scope.description} onChange={(event) => updateScope(index, 'description', event.target.value)} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} className={fieldClass} /></Field>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                                  {[
                                    ['measureRequested', 'Measure requested'],
                                    ['measured', 'Measured'],
                                    ['materialListReceived', 'Material list'],
                                    ['materialsOrdered', 'Ordered'],
                                    ['materialEta', 'Material ETA'],
                                    ['materialsReceived', 'Materials in'],
                                    ['scheduledInstall', 'Scheduled'],
                                    ['started', 'Started'],
                                    ['completed', 'Completed'],
                                  ].map(([field, label]) => <Field key={field} label={label}><input type="date" value={scope.dates[field] || ''} onChange={(event) => updateScopeDate(index, field, event.target.value)} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} className={fieldClass} /></Field>)}
                                </div>
                                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                  <Field label="Work-order specs (one Key: Value per line)"><textarea value={scope.specsText} onChange={(event) => updateScope(index, 'specsText', event.target.value)} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} placeholder={'Color: White\nQuantity: 12\nMaterial: Vinyl'} className={`${fieldClass} min-h-28 font-mono`} /></Field>
                                  <Field label="Scope notes"><textarea value={scope.notes} onChange={(event) => updateScope(index, 'notes', event.target.value)} disabled={scope.removed || (!permissions.canEditProduction && !isNew)} className={`${fieldClass} min-h-28`} /></Field>
                                </div>
                              </article>
                            ))}
                            <button type="button" onClick={addScope} disabled={!permissions.canEditProduction && !isNew} className="flex items-center rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800 hover:bg-blue-100 disabled:opacity-50"><Plus className="mr-2" size={17} /> Add work scope</button>
                          </div>
                        </Section>
                      </>
                    )}

                    {activeTab === 'financial' && (
                      <>
                        <Section icon={CircleDollarSign} title="Contract and payment outcome" description="Track the original contract, approved changes, final project amount, payments, and closeout." locked={!permissions.canEditFinancial && !isNew}>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Field label="Original contract"><input type="number" min="0" step="0.01" value={draft.job.originalContractAmount} onChange={(event) => updateJob('originalContractAmount', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass} /></Field>
                            <Field label="Final amount override"><input type="number" min="0" step="0.01" value={draft.job.finalAmount} onChange={(event) => updateJob('finalAmount', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} placeholder={`Calculated ${financials.revisedAmount}`} className={fieldClass} /></Field>
                            <Field label="Deposit"><input type="number" min="0" step="0.01" value={draft.job.depositAmount} onChange={(event) => updateJob('depositAmount', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass} /></Field>
                            <Field label="Amount paid"><input type="number" min="0" step="0.01" value={draft.job.amountPaid} onChange={(event) => updateJob('amountPaid', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass} /></Field>
                            <Field label="Payment type"><input value={draft.job.paymentType} onChange={(event) => updateJob('paymentType', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass} /></Field>
                            <Field label="Financing provider"><input value={draft.job.financingProvider} onChange={(event) => updateJob('financingProvider', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass} /></Field>
                            <Field label="Payment status"><select value={draft.job.paymentStatus} onChange={(event) => updateJob('paymentStatus', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass}>{paymentStatuses.map((status) => <option key={status} value={status}>{stageLabel(status)}</option>)}</select></Field>
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center"><p className="text-xs font-black uppercase text-blue-700">Balance due</p><p className="mt-1 text-2xl font-black text-blue-950">{currency(financials.balanceDue)}</p></div>
                            <Field label="Funded date"><input type="date" value={draft.job.fundedAt} onChange={(event) => updateJob('fundedAt', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass} /></Field>
                            <Field label="Collected date"><input type="date" value={draft.job.collectedAt} onChange={(event) => updateJob('collectedAt', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass} /></Field>
                            <Field label="Closed date"><input type="date" value={draft.job.closedAt} onChange={(event) => updateJob('closedAt', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass} /></Field>
                            <div className="flex items-end"><Toggle label="Thank-you sent" checked={draft.job.thankYouSent} onChange={(value) => updateJob('thankYouSent', value)} disabled={!permissions.canEditFinancial && !isNew} /></div>
                            <Field label="Cancellation date"><input type="date" value={draft.job.cancelledAt} onChange={(event) => { updateJob('cancelledAt', event.target.value); if (event.target.value) updateJob('productionStage', PRODUCTION_STAGE.CANCELLED); }} disabled={!permissions.canEditFinancial && !isNew} className={fieldClass} /></Field>
                            <Field label="Cancellation reason" className="md:col-span-2 xl:col-span-3"><textarea value={draft.job.cancellationReason} onChange={(event) => updateJob('cancellationReason', event.target.value)} disabled={!permissions.canEditFinancial && !isNew} className={`${fieldClass} min-h-20`} /></Field>
                          </div>
                          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Original</p><p className="text-xl font-black text-slate-950">{currency(financials.originalAmount)}</p></div>
                            <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Approved changes</p><p className="text-xl font-black text-slate-950">{currency(financials.approvedChangeOrders)}</p></div>
                            <div className="rounded-xl bg-blue-100 p-4"><p className="text-xs font-black uppercase text-blue-700">Revised</p><p className="text-xl font-black text-blue-950">{currency(financials.revisedAmount)}</p></div>
                            <div className="rounded-xl bg-green-100 p-4"><p className="text-xs font-black uppercase text-green-700">Effective final</p><p className="text-xl font-black text-green-950">{currency(financials.effectiveFinalAmount)}</p></div>
                          </div>
                        </Section>

                        <Section icon={CircleDollarSign} title="Change orders" description="Approved change orders feed the revised contract amount; rejected and void items remain in history." locked={!permissions.canEditFinancial && !isNew}>
                          <div className="space-y-4">
                            {draft.changeOrders.map((record, index) => (
                              <article key={record.id || `new-change-${index}`} className={`rounded-xl border p-4 ${record.removed ? 'border-red-200 bg-red-50 opacity-70' : 'border-slate-200 bg-white'}`}>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                                  <Field label="Requested"><input type="date" value={record.requestedAt} onChange={(event) => updateChangeOrder(index, 'requestedAt', event.target.value)} disabled={record.removed || (!permissions.canEditFinancial && !isNew)} className={fieldClass} /></Field>
                                  <Field label="Approved"><input type="date" value={record.approvedAt} onChange={(event) => updateChangeOrder(index, 'approvedAt', event.target.value)} disabled={record.removed || (!permissions.canEditFinancial && !isNew)} className={fieldClass} /></Field>
                                  <Field label="Status"><select value={record.status} onChange={(event) => updateChangeOrder(index, 'status', event.target.value)} disabled={record.removed || (!permissions.canEditFinancial && !isNew)} className={fieldClass}>{changeOrderStatuses.map((status) => <option key={status} value={status}>{stageLabel(status)}</option>)}</select></Field>
                                  <Field label="Amount"><input type="number" step="0.01" value={record.amount} onChange={(event) => updateChangeOrder(index, 'amount', event.target.value)} disabled={record.removed || (!permissions.canEditFinancial && !isNew)} className={fieldClass} /></Field>
                                  <Field label="Related scope"><select value={record.workScopeId} onChange={(event) => updateChangeOrder(index, 'workScopeId', event.target.value)} disabled={record.removed || (!permissions.canEditFinancial && !isNew)} className={fieldClass}><option value="">Whole job</option>{draft.scopes.filter((scope) => scope.id && !scope.removed).map((scope) => <option key={scope.id} value={scope.id}>{scope.category}</option>)}</select></Field>
                                  <div className="flex items-end"><button type="button" onClick={() => removeChangeOrder(index)} disabled={!permissions.canEditFinancial && !isNew} className={`w-full rounded-lg border px-3 py-2 text-xs font-black ${record.removed ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-white text-red-700'} disabled:opacity-50`}><Trash2 className="mr-1 inline" size={14} /> {record.removed ? 'Restore' : 'Void'}</button></div>
                                  <Field label="Description" className="md:col-span-2 xl:col-span-3"><input value={record.description} onChange={(event) => updateChangeOrder(index, 'description', event.target.value)} disabled={record.removed || (!permissions.canEditFinancial && !isNew)} className={fieldClass} /></Field>
                                  <Field label="Reason" className="md:col-span-2 xl:col-span-2"><input value={record.reason} onChange={(event) => updateChangeOrder(index, 'reason', event.target.value)} disabled={record.removed || (!permissions.canEditFinancial && !isNew)} className={fieldClass} /></Field>
                                  <div className="flex items-end"><Toggle label="Customer approved" checked={record.customerApproved} onChange={(value) => updateChangeOrder(index, 'customerApproved', value)} disabled={record.removed || (!permissions.canEditFinancial && !isNew)} /></div>
                                </div>
                              </article>
                            ))}
                            <button type="button" onClick={addChangeOrder} disabled={!permissions.canEditFinancial && !isNew} className="flex items-center rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800 hover:bg-blue-100 disabled:opacity-50"><Plus className="mr-2" size={17} /> Add change order</button>
                          </div>
                        </Section>
                      </>
                    )}

                    {activeTab === 'review' && (
                      <>
                        <ValidationNotice validation={validation} />
                        <Section icon={BookOpenCheck} title="Critical Path record summary" description="Review the operational record before writing the normalized dataset and refreshing existing dashboard views.">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Customer</p><p className="mt-1 text-lg font-black text-slate-950">{draft.customer.displayName || 'Missing'}</p><p className="text-sm text-slate-600">{draft.job.locationName || draft.customer.address.city || 'No city'}</p></div>
                            <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Sale</p><p className="mt-1 text-lg font-black text-slate-950">{dateLabel(draft.job.soldDate)}</p><p className="text-sm text-slate-600">{draft.job.region} · {draft.lead.source || 'No lead source'}</p></div>
                            <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Production</p><p className="mt-1 text-lg font-black text-slate-950">{stageLabel(draft.job.productionStage)}</p><p className="text-sm text-slate-600">{draft.scopes.filter((scope) => !scope.removed).length} active scopes</p></div>
                            <div className="rounded-xl bg-blue-100 p-4"><p className="text-xs font-black uppercase text-blue-700">Financial outcome</p><p className="mt-1 text-lg font-black text-blue-950">{currency(financials.effectiveFinalAmount)}</p><p className="text-sm text-blue-800">{currency(financials.balanceDue)} balance due</p></div>
                          </div>
                          {draft.job.decisionNeeded && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black uppercase text-amber-700">Decision needed</p><p className="mt-1 font-bold text-amber-950">{draft.job.decisionNeeded}</p></div>}
                        </Section>
                      </>
                    )}
                  </div>
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    {validation.errors.length > 0 ? <><AlertTriangle className="text-red-600" size={17} /> {validation.errors.length} blocking error{validation.errors.length === 1 ? '' : 's'}</> : <><CheckCircle2 className="text-green-600" size={17} /> Ready to save</>}
                  </div>
                  <button type="button" onClick={save} disabled={saving || !validation.valid} className="flex items-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? <Loader2 className="mr-2 animate-spin" size={18} /> : <Save className="mr-2" size={18} />}
                    {saving ? 'Saving…' : isNew ? 'Create sold job' : 'Save Critical Path record'}
                  </button>
                </footer>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
