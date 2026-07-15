import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Filter, MapPin, Plus, Search, X } from 'lucide-react';
import { calculateNextAction, getProjectAlerts, getRevisedAmount, getScopeStatus } from '../../utils/projectStatus';
import {
  CUSTOMER_SORT_OPTIONS,
  EMPTY_CUSTOMER_FILTERS,
  filterCustomerProjects,
  uniqueProjectValues,
} from '../../utils/customerFilters';

const Badge = ({ children, className = '' }) => <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs ${className}`}>{children}</span>;

const FILTER_LABELS = {
  region: 'Region', status: 'Status', alerts: 'Alerts', productCategory: 'Product', salesperson: 'Salesperson',
  leadSource: 'Lead source', paymentType: 'Payment', crew: 'Crew', measurer: 'Measurer',
};

const SelectFilter = ({ label, value, onChange, children }) => (
  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-800">
      <option value="">All</option>{children}
    </select>
  </label>
);

export default function CustomerWorkspace({
  projects,
  expandedProjects,
  toggleExpand,
  openProjectFile,
  openScopeFile,
  onNewProject,
  formatDate,
  currency,
  getWhiteboardDateBadges,
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('customer-asc');
  const [filters, setFilters] = useState(EMPTY_CUSTOMER_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const results = useMemo(() => filterCustomerProjects(projects, { search, sort, filters }), [projects, search, sort, filters]);
  const options = useMemo(() => ({
    region: uniqueProjectValues(projects, (project) => [project.region]),
    productCategory: uniqueProjectValues(projects, (project) => (project.scopes || []).map((scope) => scope.type)),
    salesperson: uniqueProjectValues(projects, (project) => [project.salesperson]),
    leadSource: uniqueProjectValues(projects, (project) => [project.leadSource]),
    paymentType: uniqueProjectValues(projects, (project) => [project.paymentType]),
    crew: uniqueProjectValues(projects, (project) => (project.scopes || []).map((scope) => scope.crew)),
    measurer: uniqueProjectValues(projects, (project) => (project.scopes || []).map((scope) => scope.measurer)),
  }), [projects]);
  const activeFilters = Object.entries(filters).filter(([, value]) => value);
  const clearAll = () => { setSearch(''); setFilters(EMPTY_CUSTOMER_FILTERS); };
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Customer project tools">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search customer projects</span>
            <Search size={18} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, city, phone, project, salesperson, scope…" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">Sort
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold normal-case text-slate-800">
              {CUSTOMER_SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><Filter size={16} className="mr-2 inline" />Advanced Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}</button>
          <button type="button" onClick={onNewProject} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"><Plus size={16} className="mr-2 inline" />New Project</button>
        </div>
        {filtersOpen && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <SelectFilter label="Region" value={filters.region} onChange={(value) => updateFilter('region', value)}>{options.region.map((value) => <option key={value}>{value}</option>)}</SelectFilter>
            <SelectFilter label="Project status" value={filters.status} onChange={(value) => updateFilter('status', value)}><option value="active-production">Active Production</option><option value="production-completed">Production Completed</option><option value="awaiting-collection">Awaiting Collection</option><option value="cancelled">Cancelled</option></SelectFilter>
            <SelectFilter label="Alerts" value={filters.alerts} onChange={(value) => updateFilter('alerts', value)}><option value="has">Has alerts</option><option value="none">No alerts</option></SelectFilter>
            {['productCategory', 'salesperson', 'leadSource', 'paymentType', 'crew', 'measurer'].map((key) => <SelectFilter key={key} label={FILTER_LABELS[key]} value={filters[key]} onChange={(value) => updateFilter(key, value)}>{options[key].map((value) => <option key={value}>{value}</option>)}</SelectFilter>)}
          </div>
        )}
        {filtersOpen && <p className="mt-2 text-xs text-slate-500">Awaiting Collection is the subset of Production Completed projects that is not yet marked collected or funded.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold">Showing {results.length} of {projects.length} projects</span>
          {search && <button type="button" onClick={() => setSearch('')} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Search: {search} <X size={12} className="ml-1 inline" /></button>}
          {activeFilters.map(([key, value]) => <button key={key} type="button" onClick={() => updateFilter(key, '')} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{FILTER_LABELS[key]}: {value} <X size={12} className="ml-1 inline" /></button>)}
          {(search || activeFilters.length > 0) && <button type="button" onClick={clearAll} className="text-xs font-bold text-slate-600 underline hover:text-slate-900">Clear All</button>}
        </div>
      </section>

      {results.map((project) => {
        const isExpanded = expandedProjects.has(project.id);
        const alerts = getProjectAlerts(project);
        return (
          <article key={project.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" data-help-id="customer-project-card">
            <div className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-slate-50 md:flex-row md:items-center">
              <button type="button" onClick={() => toggleExpand(project.id)} aria-expanded={isExpanded} className="flex min-w-0 items-center gap-4 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <span className={`rounded-lg p-2 ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</span>
                <span className="min-w-0"><span className="block truncate text-lg font-black text-slate-900">{project.customer}</span><span className="mt-0.5 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500"><span className="flex items-center"><MapPin size={14} className="mr-1" />{project.city}</span><span>{project.scopes.length} scopes</span><span>{project.salesperson || 'Unassigned'}</span>{project.cancelled && <Badge className="border-red-200 bg-red-50 text-red-700">Cancelled</Badge>}</span></span>
              </button>
              <div className="flex flex-wrap items-center gap-4 md:ml-auto md:justify-end">
                {alerts.length > 0 && <Badge className="border-amber-200 bg-amber-50 text-amber-700">{alerts.length} attention</Badge>}
                <div><div className="text-xs font-bold uppercase text-slate-400">Current Total</div><div className="font-black tabular-nums text-slate-800">{currency(getRevisedAmount(project))}</div></div>
                <div><div className="text-xs font-bold uppercase text-slate-400">Active Since</div><div className="font-bold text-slate-700">{formatDate(project.dateSold)}</div></div>
                <button type="button" onClick={() => openProjectFile(project, { initialTab: 'overview' })} data-help-id="customer-open-file" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">Open File</button>
              </div>
            </div>
            {isExpanded && <div className="border-t border-slate-100 bg-slate-50 p-4 md:pl-16"><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {project.scopes.map((scope) => { const status = getScopeStatus(scope); return <button type="button" key={scope.id} onClick={() => openScopeFile(project, scope)} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><div className="mb-3 flex items-start justify-between gap-3"><h4 className="font-bold text-slate-800">{scope.type}</h4><Badge className={status.color}>{status.label}</Badge></div><p className="mb-1 text-xs font-bold uppercase text-slate-500">Next Action</p><p className="text-sm font-bold text-blue-700">{calculateNextAction(scope, project)}</p><div className="mt-3 flex flex-wrap gap-1">{getWhiteboardDateBadges(scope).map((badge) => <Badge key={badge.label} className={badge.className}>{badge.label}: {formatDate(badge.value)}</Badge>)}</div><div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"><span>Sub: {scope.crew || 'TBD'}</span><span>ETA: {formatDate(scope.materialETA)}</span></div></button>; })}
              {project.scopes.length === 0 && <p className="p-2 text-sm italic text-slate-500">No work scopes defined for this project.</p>}
            </div></div>}
          </article>
        );
      })}
      {results.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-black text-slate-800">No customer projects match</h3><p className="mt-1 text-sm text-slate-500">Clear a filter or broaden the search to see projects.</p><button type="button" onClick={clearAll} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Clear All</button></div>}
    </div>
  );
}
