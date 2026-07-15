import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content);

const replaceOnce = (path, search, replacement) => {
  const source = read(path);
  const index = source.indexOf(search);
  if (index === -1) throw new Error(`Expected source not found in ${path}: ${search.slice(0, 100)}`);
  if (source.indexOf(search, index + search.length) !== -1) throw new Error(`Expected source is not unique in ${path}: ${search.slice(0, 100)}`);
  write(path, `${source.slice(0, index)}${replacement}${source.slice(index + search.length)}`);
};

const replaceRegexOnce = (path, pattern, replacement) => {
  const source = read(path);
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`Expected one regex match in ${path}, found ${matches.length}: ${pattern}`);
  write(path, source.replace(pattern, replacement));
};

const insertBeforeLast = (path, marker, content) => {
  const source = read(path);
  const index = source.lastIndexOf(marker);
  if (index === -1) throw new Error(`Last marker not found in ${path}: ${marker}`);
  write(path, `${source.slice(0, index)}${content}${source.slice(index)}`);
};

// ---------------------------------------------------------------------------
// Legacy compatibility fields: actual collection timing and scope allocation.
// ---------------------------------------------------------------------------
replaceRegexOnce(
  'src/domain/legacyProjectAdapter.js',
  /export const normalizeLegacyScope = \(scope = \{\}\) => \(\{[\s\S]*?\n\}\);/g,
  `export const normalizeLegacyScope = (scope = {}) => ({
  ...asObject(scope),
  measureRequested: scope?.measureRequested || '',
  allocatedAmount: scope?.allocatedAmount === '' || scope?.allocatedAmount === null || scope?.allocatedAmount === undefined
    ? ''
    : Number(scope.allocatedAmount || 0),
  specs: asObject(scope?.specs),
});`,
);
replaceRegexOnce(
  'src/domain/legacyProjectAdapter.js',
  /export const normalizeLegacyProject = \(project = \{\}\) => \(\{[\s\S]*?\n\}\);/g,
  `export const normalizeLegacyProject = (project = {}) => {
  const changeOrders = Array.isArray(project?.changeOrders) ? project.changeOrders : [];
  const revisedAmount = Number(project?.originalAmount || 0)
    + changeOrders.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
  const defaultAmountCollected = project?.collected ? revisedAmount : Number(project?.deposit || 0);

  return {
    ...asObject(project),
    amountCollected: project?.amountCollected === '' || project?.amountCollected === null || project?.amountCollected === undefined
      ? defaultAmountCollected
      : Number(project.amountCollected || 0),
    collectedDate: project?.collectedDate || '',
    cancellationDate: project?.cancellationDate || '',
    cancellationReason: project?.cancellationReason || '',
    changeOrders,
    intake: asObject(project?.intake),
    permits: asObject(project?.permits),
    scopes: Array.isArray(project?.scopes) ? project.scopes.map(normalizeLegacyScope) : [],
  };
};`,
);

replaceOnce(
  'src/domain/legacyToProduction.js',
  `    const finalAmount = revisedAmount(project);
    const allScopesCompleted = project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate);
    const completionDates = project.scopes.map((scope) => scope.completionDate).filter(Boolean).sort();
    const completedAt = completionDates.at(-1) || '';`,
  `    const finalAmount = revisedAmount(project);
    const allScopesCompleted = project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate);
    const completionDates = project.scopes.map((scope) => scope.completionDate).filter(Boolean).sort();
    const completedAt = completionDates.at(-1) || '';
    const amountPaid = Math.max(0, Number(project.amountCollected ?? (project.collected ? finalAmount : project.deposit || 0)));
    const collectionDate = project.collectedDate || '';`,
);
replaceOnce(
  'src/domain/legacyToProduction.js',
  `      amountPaid: project.collected ? finalAmount : Number(project.deposit || 0),
      balanceDue: project.collected ? 0 : Math.max(0, finalAmount - Number(project.deposit || 0)),
      fundedAt: project.collected ? completedAt : '',
      collectedAt: project.collected ? completedAt : '',
      closedAt: project.collected && allScopesCompleted ? completedAt : '',`,
  `      amountPaid,
      balanceDue: Math.max(0, finalAmount - amountPaid),
      fundedAt: project.collected ? collectionDate : '',
      collectedAt: project.collected ? collectionDate : '',
      closedAt: project.collected && allScopesCompleted ? (collectionDate || completedAt) : '',`,
);
replaceOnce(
  'src/domain/legacyToProduction.js',
  `        category: scope.type,
        productionStage: inferScopeStage(scope, project),`,
  `        category: scope.type,
        allocatedAmount: scope.allocatedAmount,
        productionStage: inferScopeStage(scope, project),`,
);

replaceOnce(
  'src/domain/productionToLegacy.js',
  `  type: record.category || '',
  measurer: record.measurerName || '',`,
  `  type: record.category || '',
  allocatedAmount: record.allocatedAmount === undefined || record.allocatedAmount === null ? '' : Number(record.allocatedAmount),
  measurer: record.measurerName || '',`,
);
replaceOnce(
  'src/domain/productionToLegacy.js',
  `      deposit: Number(job.depositAmount || 0),
      collected,
      thankYouSent: Boolean(job.thankYouSent),`,
  `      deposit: Number(job.depositAmount || 0),
      amountCollected: Number(job.amountPaid || 0),
      collectedDate: job.collectedAt || job.fundedAt ? String(job.collectedAt || job.fundedAt).slice(0, 10) : '',
      collected,
      thankYouSent: Boolean(job.thankYouSent),`,
);

replaceOnce(
  'src/domain/entityFactories.js',
  `  category: cleanText(input.category || input.type),
  description: cleanText(input.description),`,
  `  category: cleanText(input.category || input.type),
  allocatedAmount: input.allocatedAmount === '' || input.allocatedAmount === null || input.allocatedAmount === undefined
    ? null
    : asNumber(input.allocatedAmount),
  description: cleanText(input.description),`,
);

replaceOnce(
  'src/services/repositories/supabaseMappers.js',
  `  category: record.category,
  description: record.description,`,
  `  category: record.category,
  allocated_amount: record.allocatedAmount,
  description: record.description,`,
);
replaceOnce(
  'src/services/repositories/supabaseMappers.js',
  `  category: row.category,
  description: row.description,`,
  `  category: row.category,
  allocatedAmount: row.allocated_amount === null ? null : number(row.allocated_amount),
  description: row.description,`,
);

replaceOnce(
  'src/domain/validation.js',
  `  if (!isNonEmptyText(record?.category)) errors.push('category is required');
  if (!enumValues(PRODUCTION_STAGE).includes(record?.productionStage)) errors.push('productionStage is invalid');`,
  `  if (!isNonEmptyText(record?.category)) errors.push('category is required');
  if (record?.allocatedAmount !== null && record?.allocatedAmount !== undefined && !isFiniteNumber(record.allocatedAmount)) errors.push('allocatedAmount must be numeric when supplied');
  if (Number(record?.allocatedAmount || 0) < 0) errors.push('allocatedAmount cannot be negative');
  if (!enumValues(PRODUCTION_STAGE).includes(record?.productionStage)) errors.push('productionStage is invalid');`,
);

replaceOnce(
  'src/auth/runtimeAuthorization.js',
  `  deposit: Number(project.deposit || 0),
  collected: Boolean(project.collected),`,
  `  deposit: Number(project.deposit || 0),
  amountCollected: Number(project.amountCollected || 0),
  collectedDate: project.collectedDate || '',
  collected: Boolean(project.collected),`,
);
replaceOnce(
  'src/auth/runtimeAuthorization.js',
  `  scopes: Array.isArray(project.scopes) ? project.scopes : [],`,
  `  scopes: Array.isArray(project.scopes) ? project.scopes : [],`,
);

replaceOnce(
  'schemas/production-dataset.schema.json',
  `            "category": { "type": "string", "minLength": 1 },
            "description": { "type": "string" },`,
  `            "category": { "type": "string", "minLength": 1 },
            "allocatedAmount": { "type": ["number", "null"], "minimum": 0 },
            "description": { "type": "string" },`,
);

// ---------------------------------------------------------------------------
// Shared sales activity hydration/sync behind the existing Sales view.
// ---------------------------------------------------------------------------
replaceOnce(
  'src/app/MLBDashboard.jsx',
  `import {
  isSharedProjectBackendEnabled,
  loadSharedProjects,
  subscribeToSharedProjectChanges,
} from '../services/sharedProjectStorage';`,
  `import {
  isSharedProjectBackendEnabled,
  loadSharedProjects,
  subscribeToSharedProjectChanges,
} from '../services/sharedProjectStorage';
import {
  loadSalesActivity,
  loadSharedSalesActivity,
  saveSalesActivity,
  saveSharedSalesActivity,
  subscribeToSharedSalesActivity,
} from '../services/salesActivityStorage';`,
);
insertBeforeLast(
  'src/app/MLBDashboard.jsx',
  `  return (`,
  `  useEffect(() => {
    if (!profile) return undefined;
    let disposed = false;
    let unsubscribe = () => {};
    let refreshTimer = null;

    const hydrate = async () => {
      const localRecords = loadSalesActivity();
      const result = await loadSharedSalesActivity(localRecords);
      if (disposed) return;
      if (result.usedRemote) {
        saveSalesActivity(result.records, { force: true });
        setInstanceKey((current) => current + 1);
      } else if (result.available && result.reason === 'REMOTE_SALES_ACTIVITY_EMPTY' && localRecords.length) {
        await saveSharedSalesActivity(localRecords);
      }
    };

    const handleLocalSave = (event) => {
      saveSharedSalesActivity(event.detail?.records || loadSalesActivity())
        .catch((error) => setAuthorizationMessage(error.message || 'Unable to sync sales activity.'));
    };
    const scheduleHydrate = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(hydrate, 250);
    };

    window.addEventListener('mlb-sales-activity-saved', handleLocalSave);
    hydrate().then(() => {
      if (!disposed) unsubscribe = subscribeToSharedSalesActivity(scheduleHydrate);
    });

    return () => {
      disposed = true;
      unsubscribe();
      window.clearTimeout(refreshTimer);
      window.removeEventListener('mlb-sales-activity-saved', handleLocalSave);
    };
  }, [profile?.id]);

`,
);

// ---------------------------------------------------------------------------
// Active dashboard UI and calculations.
// ---------------------------------------------------------------------------
const dashboardPath = 'src/MLBDashboard_field_complete.jsx';
replaceOnce(
  dashboardPath,
  `import { exportProjectsJson, importProjectsJson, loadProjects, resetProjects, saveProjects } from './services/projectStorage';`,
  `import { exportProjectsJson, importProjectsJson, loadProjects, resetProjects, saveProjects } from './services/projectStorage';
import { loadSalesActivity, saveSalesActivity } from './services/salesActivityStorage';
import { CAPABILITY } from './auth/permissions';
import { hasRuntimeCapability } from './auth/runtimeAuthorization';
import {
  createCategoryIntegritySummary,
  createCollectionMetrics,
  createSalesStats as createMetricSalesStats,
  createSalesVsProductionMetrics,
} from './utils/projectMetrics';`,
);
replaceRegexOnce(
  dashboardPath,
  /\nconst salesActivity = \{[\s\S]*?\n\};\n/g,
  `\n`,
);
replaceOnce(
  dashboardPath,
  `  deposit: '',
  collected: false,
  thankYouSent: false,`,
  `  deposit: '',
  amountCollected: '',
  collectedDate: '',
  collected: false,
  thankYouSent: false,`,
);
replaceOnce(
  dashboardPath,
  `  type: 'Roofs',
  measurer: '',`,
  `  type: 'Roofs',
  allocatedAmount: '',
  measurer: '',`,
);

replaceOnce(
  dashboardPath,
  `<label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={formData.collected} onChange={(event) => updateField('collected', event.target.checked)} /> Collected / Funded<Help id="modal-collected-funded" /></label>`,
  `<label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={formData.collected} onChange={(event) => setFormData((prev) => {
                    const collected = event.target.checked;
                    return {
                      ...prev,
                      collected,
                      collectedDate: collected ? (prev.collectedDate || todayISO()) : '',
                      amountCollected: collected ? Math.max(Number(prev.amountCollected || 0), getRevisedAmount(prev)) : Number(prev.amountCollected || 0),
                    };
                  })} /> Collected / Funded<Help id="modal-collected-funded" /></label>`,
);
replaceOnce(
  dashboardPath,
  `                </div>
                {formData.cancelled && (`,
  `                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Total Paid / Funded<input type="number" min="0" step="0.01" value={formData.amountCollected ?? ''} onChange={(event) => setFormData((prev) => {
                    const amountCollected = event.target.value;
                    const paidInFull = Number(amountCollected || 0) >= getRevisedAmount(prev) && getRevisedAmount(prev) > 0;
                    return { ...prev, amountCollected, collected: paidInFull ? true : prev.collected };
                  })} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900" /></label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Collected / Funded Date<input type="date" value={formData.collectedDate || ''} onChange={(event) => updateField('collectedDate', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900" /></label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Remaining Balance</p><p className="mt-1 text-lg font-black text-slate-900">{currency(Math.max(0, getRevisedAmount(formData) - Number(formData.amountCollected || 0)))}</p></div>
                </div>
                {formData.collected && !formData.collectedDate && <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">A collected/funded date is required for completion-to-payment reporting.</p>}
                {formData.cancelled && (`,
);
replaceOnce(
  dashboardPath,
  `<label className="block text-xs font-bold uppercase text-slate-500">Product Category<select value={editingScope.type} onChange={(event) => setEditingScope({ ...editingScope, type: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm">{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="block text-xs font-bold uppercase text-slate-500">Assigned Crew / Sub`,
  `<label className="block text-xs font-bold uppercase text-slate-500">Product Category<select value={editingScope.type} onChange={(event) => setEditingScope({ ...editingScope, type: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm">{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="block text-xs font-bold uppercase text-slate-500">Scope Revenue Allocation<input type="number" min="0" step="0.01" value={editingScope.allocatedAmount ?? ''} onChange={(event) => setEditingScope({ ...editingScope, allocatedAmount: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /><span className="mt-1 block text-[10px] font-medium normal-case text-slate-400">Required only to report revenue by category on multi-scope projects.</span></label>
                <label className="block text-xs font-bold uppercase text-slate-500">Assigned Crew / Sub`,
);

replaceOnce(
  dashboardPath,
  `  const [projects, setProjects] = useState(() => loadProjects(initialProjects));`,
  `  const [projects, setProjects] = useState(() => loadProjects(initialProjects));
  const [salesActivityRecords, setSalesActivityRecords] = useState(() => loadSalesActivity());
  const [salesActivityDraft, setSalesActivityDraft] = useState(() => ({ activityDate: todayISO(), salesperson: '', region: 'Virginia', leadSource: '', category: 'All', leads: '', opportunities: '' }));
  const [salesCategoryFilter, setSalesCategoryFilter] = useState('All');
  const canManageSalesActivity = hasRuntimeCapability(CAPABILITY.MANAGE_SALES_DATA);`,
);

replaceRegexOnce(
  dashboardPath,
  /  const salesStats = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[filteredProjects\]\);\n\n  const wallboardColumns/g,
  `  const categoryFilteredProjects = useMemo(() => filteredProjects.filter((project) => (
    salesCategoryFilter === 'All' || project.scopes.some((scope) => scope.type === salesCategoryFilter)
  )), [filteredProjects, salesCategoryFilter]);

  const filteredSalesActivity = useMemo(() => salesActivityRecords.filter((activity) => {
    const regionMatch = regionFilter === 'All' || activity.region === regionFilter;
    const periodMatch = isInPeriod(activity.activityDate, periodFilter, customPeriodStart, customPeriodEnd);
    const categoryMatch = salesCategoryFilter === 'All' || activity.category === salesCategoryFilter;
    return regionMatch && periodMatch && categoryMatch;
  }), [salesActivityRecords, regionFilter, periodFilter, customPeriodStart, customPeriodEnd, salesCategoryFilter]);

  const salesStats = useMemo(
    () => createMetricSalesStats(categoryFilteredProjects, filteredSalesActivity, { category: salesCategoryFilter }),
    [categoryFilteredProjects, filteredSalesActivity, salesCategoryFilter],
  );

  const metricPeriodMatch = (date) => isInPeriod(date, periodFilter, customPeriodStart, customPeriodEnd);
  const salesVsProduction = useMemo(() => createSalesVsProductionMetrics(projects, {
    region: regionFilter,
    category: salesCategoryFilter,
    matchesPeriod: metricPeriodMatch,
  }), [projects, regionFilter, salesCategoryFilter, periodFilter, customPeriodStart, customPeriodEnd]);
  const collectionMetrics = useMemo(() => createCollectionMetrics(projects, {
    region: regionFilter,
    category: salesCategoryFilter,
    matchesPeriod: metricPeriodMatch,
  }), [projects, regionFilter, salesCategoryFilter, periodFilter, customPeriodStart, customPeriodEnd]);
  const categoryIntegrity = useMemo(
    () => createCategoryIntegritySummary(categoryFilteredProjects, salesCategoryFilter),
    [categoryFilteredProjects, salesCategoryFilter],
  );

  const addSalesActivity = () => {
    if (!salesActivityDraft.salesperson.trim() || Number(salesActivityDraft.leads || 0) < 0) return;
    const record = {
      ...salesActivityDraft,
      id: `SA-${Date.now()}`,
      salesperson: salesActivityDraft.salesperson.trim(),
      leads: Number(salesActivityDraft.leads || 0),
      opportunities: Number(salesActivityDraft.opportunities || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [record, ...salesActivityRecords];
    if (saveSalesActivity(next)) {
      setSalesActivityRecords(next);
      setSalesActivityDraft((current) => ({ ...current, salesperson: '', leadSource: '', leads: '', opportunities: '' }));
    }
  };
  const deleteSalesActivity = (recordId) => {
    const next = salesActivityRecords.filter((record) => record.id !== recordId);
    if (saveSalesActivity(next)) setSalesActivityRecords(next);
  };

  const wallboardColumns`,
);

replaceOnce(
  dashboardPath,
  `<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5" data-help-id="customer-view-summary">`,
  `<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6" data-help-id="customer-view-summary">`,
);
replaceOnce(
  dashboardPath,
  `      <MetricCard label="Avg Sold to Done" value={\`${pipelineMetrics.avgSoldToDone || '-'}d\`} detail="Completed scopes only" />
    </div>`,
  `      <MetricCard label="Avg Sold to Done" value={\`${pipelineMetrics.avgSoldToDone || '-'}d\`} detail="Completed scopes only" />
      <MetricCard label="Complete to Payment" value={collectionMetrics.measuredProjects ? \`${collectionMetrics.avgCompletionToPayment}d\` : '-'} detail={\`${collectionMetrics.openProjects} completed awaiting payment\`} tone={collectionMetrics.openProjects ? 'bg-amber-50' : 'bg-white'} />
    </div>`,
);

replaceRegexOnce(
  dashboardPath,
  /  const SalesView = \(\) => \{[\s\S]*?\n  \};\n\n  const renderBookFilterControl/g,
  `  const SalesView = () => {
    const totalRevenue = salesStats.reduce((sum, rep) => sum + rep.revenue, 0);
    const totalLeads = salesStats.reduce((sum, rep) => sum + rep.leads, 0);
    const totalProjects = salesStats.reduce((sum, rep) => sum + rep.projects, 0);
    const totalCancelled = salesStats.reduce((sum, rep) => sum + rep.cancelled, 0);
    const unresolvedRevenue = salesStats.reduce((sum, rep) => sum + rep.unallocatedProjects, 0);

    return (
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-xl font-black text-slate-900">Sales and Production Capacity</h2>
              <p className="mt-1 text-sm text-slate-500">Revenue comes only from saved Project Files. Lead activity records volumes for prospects that never become projects.</p>
            </div>
            <label className="text-xs font-black uppercase tracking-wide text-slate-600">Product Category
              <select value={salesCategoryFilter} onChange={(event) => setSalesCategoryFilter(event.target.value)} className="mt-1 block min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold normal-case text-slate-800">
                <option>All</option>{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
          </div>
          {unresolvedRevenue > 0 && <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{unresolvedRevenue} multi-scope project{unresolvedRevenue === 1 ? '' : 's'} match this category but are excluded from category revenue until scope allocations equal the revised project total.</p>}
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7" data-help-id="sales-summary-metrics">
          <MetricCard label="Sales Revenue" value={currency(totalRevenue)} detail={\`${periodLabel} recognized sold value\`} helpId="sales-revenue" helpIcon={<Help id="sales-revenue" />} />
          <MetricCard label="Projects Sold" value={totalProjects} detail="Sold-date period" helpId="sales-projects-sold" helpIcon={<Help id="sales-projects-sold" />} />
          <MetricCard label="Leads Given" value={totalLeads} detail="Saved lead activity" helpId="sales-leads-given" helpIcon={<Help id="sales-leads-given" />} />
          <MetricCard label="Close Rate" value={totalLeads ? \`${Math.round((totalProjects / totalLeads) * 100)}%\` : '-'} detail="Projects divided by leads" helpId="sales-close-rate" helpIcon={<Help id="sales-close-rate" />} />
          <MetricCard label="Cancel Rate" value={totalProjects + totalCancelled ? \`${Math.round((totalCancelled / (totalProjects + totalCancelled)) * 100)}%\` : '-'} detail={\`${totalCancelled} cancelled\`} tone={totalCancelled ? 'bg-red-50' : 'bg-white'} helpId="sales-cancel-rate" helpIcon={<Help id="sales-cancel-rate" />} />
          <MetricCard label="Production Completed" value={currency(salesVsProduction.completedValue)} detail={\`${salesVsProduction.completedProjects} completion-date projects\`} />
          <MetricCard label="Complete to Payment" value={collectionMetrics.measuredProjects ? \`${collectionMetrics.avgCompletionToPayment}d\` : '-'} detail={\`${collectionMetrics.openProjects} awaiting payment\`} tone={collectionMetrics.openProjects ? 'bg-amber-50' : 'bg-white'} />
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <MetricCard label="Booked in Period" value={currency(salesVsProduction.soldValue)} detail={\`${salesVsProduction.soldProjects} sold projects\`} />
          <MetricCard label="Completed in Period" value={currency(salesVsProduction.completedValue)} detail={\`${salesVsProduction.completedProjects} completed projects\`} />
          <MetricCard label="Production / Sales" value={salesVsProduction.soldValue ? \`${Math.round(salesVsProduction.productionToSalesRatio * 100)}%\` : '-'} detail="Completed value divided by booked value" tone={salesVsProduction.productionToSalesRatio < 0.8 && salesVsProduction.soldValue ? 'bg-amber-50' : 'bg-white'} />
          <MetricCard label="Backlog Movement" value={currency(salesVsProduction.backlogMovement)} detail={salesVsProduction.backlogMovement >= 0 ? 'Sales added more than production completed' : 'Production reduced backlog'} tone={salesVsProduction.backlogMovement > 0 ? 'bg-amber-50' : 'bg-green-50'} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h3 className="font-bold text-slate-800">Lead Activity Input</h3>
            <p className="mt-1 text-sm text-slate-500">This records lead counts only. Customer, contract, revenue, and production data remain exclusively in New Project → Open File.</p>
          </div>
          {canManageSalesActivity && (
            <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-5 md:grid-cols-4 xl:grid-cols-8">
              <label className="text-xs font-bold uppercase text-slate-500">Date<input type="date" value={salesActivityDraft.activityDate} onChange={(event) => setSalesActivityDraft({ ...salesActivityDraft, activityDate: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm text-slate-900" /></label>
              <label className="text-xs font-bold uppercase text-slate-500">Salesperson<input value={salesActivityDraft.salesperson} onChange={(event) => setSalesActivityDraft({ ...salesActivityDraft, salesperson: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm text-slate-900" /></label>
              <label className="text-xs font-bold uppercase text-slate-500">Region<select value={salesActivityDraft.region} onChange={(event) => setSalesActivityDraft({ ...salesActivityDraft, region: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm text-slate-900"><option>Virginia</option><option>Carolina</option></select></label>
              <label className="text-xs font-bold uppercase text-slate-500">Lead Source<input value={salesActivityDraft.leadSource} onChange={(event) => setSalesActivityDraft({ ...salesActivityDraft, leadSource: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm text-slate-900" /></label>
              <label className="text-xs font-bold uppercase text-slate-500">Category<select value={salesActivityDraft.category} onChange={(event) => setSalesActivityDraft({ ...salesActivityDraft, category: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm text-slate-900"><option>All</option>{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="text-xs font-bold uppercase text-slate-500">Leads<input type="number" min="0" value={salesActivityDraft.leads} onChange={(event) => setSalesActivityDraft({ ...salesActivityDraft, leads: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm text-slate-900" /></label>
              <label className="text-xs font-bold uppercase text-slate-500">Opportunities<input type="number" min="0" value={salesActivityDraft.opportunities} onChange={(event) => setSalesActivityDraft({ ...salesActivityDraft, opportunities: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm text-slate-900" /></label>
              <button type="button" onClick={addSalesActivity} className="self-end rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Add Activity</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50"><tr>{['Date', 'Salesperson', 'Region', 'Source', 'Category', 'Leads', 'Opportunities', ''].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSalesActivity.map((record) => <tr key={record.id}><td className="px-4 py-3">{formatDate(record.activityDate)}</td><td className="px-4 py-3 font-bold">{record.salesperson}</td><td className="px-4 py-3">{record.region}</td><td className="px-4 py-3">{record.leadSource || '-'}</td><td className="px-4 py-3">{record.category}</td><td className="px-4 py-3 font-bold">{record.leads}</td><td className="px-4 py-3">{record.opportunities}</td><td className="px-4 py-3 text-right">{canManageSalesActivity && <button type="button" onClick={() => deleteSalesActivity(record.id)} className="text-xs font-bold text-red-600 hover:underline">Delete</button>}</td></tr>)}
                {filteredSalesActivity.length === 0 && <tr><td colSpan="8" className="px-4 py-8 text-center italic text-slate-400">No saved lead activity for the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" data-help-id="salesperson-performance-table">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h3 className="font-bold text-slate-800">Salesperson Performance<Help id="salesperson-performance-table" /></h3>
            <p className="mt-1 text-sm text-slate-500">Tracks revised project revenue, average contract, real lead activity, close rate, value per lead, and cancellations.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>{['Salesperson', 'Projects', 'Cancelled', 'Scopes', 'Revenue', 'Deposits', 'Avg Contract', 'Leads', 'Close Rate', 'Value / Lead', 'Cancel Rate'].map((heading) => <th key={heading} className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {salesStats.map((rep) => <tr key={rep.name} className="hover:bg-slate-50"><td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">{rep.name}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{rep.projects}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{rep.cancelled}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{rep.scopes}</td><td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">{currency(rep.revenue)}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{currency(rep.deposits)}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{currency(rep.avgTicket)}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{rep.leads}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{rep.leads ? \`${Math.round(rep.closingRate * 100)}%\` : '-'}</td><td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700" data-help-id="sales-value-per-lead">{rep.leads ? currency(rep.valuePerLead) : '-'}<Help id="sales-value-per-lead" /></td><td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{Math.round(rep.cancellationRate * 100)}%</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderBookFilterControl`,
);

replaceOnce(
  dashboardPath,
  `              <div className="rounded-lg bg-green-950 p-4"><p className="text-xs font-black uppercase text-green-300">Close Rate</p><p className="text-3xl font-black text-white">{wallboardSalesTotals.closeRate}%</p></div>
              <div className="rounded-lg bg-red-950 p-4"><p className="text-xs font-black uppercase text-red-300">Cancel Rate</p><p className="text-3xl font-black text-white">{wallboardSalesTotals.cancellationRate}%</p></div>`,
  `              <div className="rounded-lg bg-green-950 p-4"><p className="text-xs font-black uppercase text-green-300">Close Rate</p><p className="text-3xl font-black text-white">{wallboardSalesTotals.totalLeads ? \`${wallboardSalesTotals.closeRate}%\` : '-'}</p></div>
              <div className="rounded-lg bg-red-950 p-4"><p className="text-xs font-black uppercase text-red-300">Cancel Rate</p><p className="text-3xl font-black text-white">{wallboardSalesTotals.cancellationRate}%</p></div>
              <div className="rounded-lg bg-slate-950 p-4"><p className="text-xs font-black uppercase text-slate-400">Production Completed</p><p className="text-2xl font-black text-white">{currency(salesVsProduction.completedValue)}</p></div>
              <div className="rounded-lg bg-amber-950 p-4"><p className="text-xs font-black uppercase text-amber-300">Backlog Movement</p><p className="text-2xl font-black text-white">{currency(salesVsProduction.backlogMovement)}</p></div>`,
);

replaceOnce(
  dashboardPath,
  `       'Completion Date',
       'Collected/Funded',`,
  `       'Completion Date',
       'Scope Revenue Allocation',
       'Amount Paid/Funded',
       'Collected/Funded Date',
       'Collected/Funded',`,
);
replaceOnce(
  dashboardPath,
  `        scope?.completionDate || '',
        project.collected ? 'Yes' : 'No',`,
  `        scope?.completionDate || '',
        scope?.allocatedAmount ?? '',
        project.amountCollected ?? '',
        project.collectedDate || '',
        project.collected ? 'Yes' : 'No',`,
);

// ---------------------------------------------------------------------------
// Verification hooks.
// ---------------------------------------------------------------------------
replaceOnce(
  'package.json',
  `"phase6:verify": "node --experimental-loader ./scripts/extensionless-esm-loader.mjs scripts/verify-phase6-manual-entry.mjs && node --experimental-loader ./scripts/extensionless-esm-loader.mjs scripts/verify-project-file-workflow.mjs"`,
  `"phase6:verify": "node --experimental-loader ./scripts/extensionless-esm-loader.mjs scripts/verify-phase6-manual-entry.mjs && node --experimental-loader ./scripts/extensionless-esm-loader.mjs scripts/verify-project-file-workflow.mjs && node --experimental-loader ./scripts/extensionless-esm-loader.mjs scripts/verify-metric-integrity.mjs"`,
);

console.log('Metric-integrity source patch applied successfully.');
