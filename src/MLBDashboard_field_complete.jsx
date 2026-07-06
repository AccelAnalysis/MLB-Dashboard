import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  LayoutDashboard,
  ListChecks,
  Maximize2,
  MapPin,
  Minimize2,
  Monitor,
  Plus,
  Presentation,
  Printer,
  Ruler,
  Trash2,
  Upload,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { exportProjectsJson, importProjectsJson, loadProjects, resetProjects, saveProjects } from './services/projectStorage';
import HelpCenterDrawer from './help/HelpCenterDrawer';
import GuidedWalkthrough from './help/GuidedWalkthrough';
import HelpIcon from './help/HelpIcon';
import { HELP_STORAGE_KEY, helpById } from './help/helpContent';

const toISODate = (date) => date.toISOString().split('T')[0];
const todayISO = () => toISODate(new Date());
const daysAgo = (days) => toISODate(new Date(Date.now() - days * 86400000));
const daysFromNow = (days) => toISODate(new Date(Date.now() + days * 86400000));

const currency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${dateStr}T00:00:00`));
};

const daysBetween = (newerDate, olderDate) => {
  if (!newerDate || !olderDate) return 0;
  return Math.floor((new Date(`${newerDate}T00:00:00`) - new Date(`${olderDate}T00:00:00`)) / 86400000);
};

const initialProjects = [
  {
    id: 'P-1001',
    customer: 'Smith Family',
    city: 'Suffolk',
    region: 'Virginia',
    phone: '555-0101',
    dateSold: daysAgo(15),
    salesperson: 'Jack',
    leadSource: 'Website',
    paymentType: 'Finance',
    originalAmount: 32000,
    deposit: 16000,
    collected: false,
    thankYouSent: false,
    cancelled: false,
    cancellationDate: '',
    cancellationReason: '',
    changeOrders: [{ id: 1, date: daysAgo(5), description: 'Added 2 extra windows', amount: 1500 }],
    intake: { contractReceived: true, uploadedJN: true, estimateApproved: true, budgetCreated: true, invoiceCreated: true, fileCreated: true },
    permits: { required: true, type: 'Building', submittedDate: daysAgo(12), approvedDate: daysAgo(2), notes: '' },
    notes: 'Dog in backyard. Finance approved through Greensky.',
    decisionNeeded: '',
    scopes: [
      {
        id: 'S-1001-A',
        type: 'Windows',
        measurer: 'Alonzo',
        measureRequested: daysAgo(14),
        measureCompleted: daysAgo(12),
        materialListReceived: daysAgo(11),
        dateOrdered: daysAgo(10),
        vendor: 'ABC Supply',
        materialETA: daysFromNow(4),
        materialsIn: null,
        crew: 'Team A',
        scheduledInstallDate: null,
        completionDate: null,
        specs: { 'Window Style': 'Double Hung', Color: 'White', Grid: 'Yes', Quantity: '12' },
        notes: 'Custom sizing on the bay window.',
      },
      {
        id: 'S-1001-B',
        type: 'Siding',
        measurer: 'Alonzo',
        measureRequested: daysAgo(14),
        measureCompleted: daysAgo(12),
        materialListReceived: null,
        dateOrdered: null,
        vendor: '',
        materialETA: null,
        materialsIn: null,
        crew: '',
        scheduledInstallDate: null,
        completionDate: null,
        specs: { Color: 'Slate Blue', Trim: 'White', 'House Wrap': 'Yes' },
        notes: 'Waiting on material list from Alonzo to order.',
      },
    ],
  },
  {
    id: 'P-1002',
    customer: 'Jones Decking',
    city: 'Chesapeake',
    region: 'Virginia',
    phone: '555-0202',
    dateSold: daysAgo(4),
    salesperson: 'Sarah',
    leadSource: 'Referral',
    paymentType: 'Cash',
    originalAmount: 18500,
    deposit: 9250,
    collected: false,
    thankYouSent: false,
    cancelled: false,
    cancellationDate: '',
    cancellationReason: '',
    changeOrders: [],
    intake: { contractReceived: true, uploadedJN: true, estimateApproved: false, budgetCreated: false, invoiceCreated: false, fileCreated: false },
    permits: { required: true, type: 'Zoning', submittedDate: null, approvedDate: null, notes: 'Need HOA approval first' },
    notes: 'HOA paperwork submitted by homeowner.',
    decisionNeeded: 'Jimmy needs to approve starter budget',
    scopes: [
      {
        id: 'S-1002-A',
        type: 'Decks',
        measurer: 'Tito',
        measureRequested: daysAgo(3),
        measureCompleted: null,
        materialListReceived: null,
        dateOrdered: null,
        vendor: '',
        materialETA: null,
        materialsIn: null,
        crew: '',
        scheduledInstallDate: null,
        completionDate: null,
        specs: { Material: 'Trex', Color: 'Spiced Rum', Railing: 'Black Metal' },
        notes: 'Needs measurement ASAP.',
      },
    ],
  },
  {
    id: 'P-1003',
    customer: 'Davis Exterior',
    city: 'Elizabeth City',
    region: 'Carolina',
    phone: '555-0303',
    dateSold: daysAgo(45),
    salesperson: 'Mike',
    leadSource: 'Angi',
    paymentType: 'Finance',
    originalAmount: 25000,
    deposit: 0,
    collected: false,
    thankYouSent: false,
    cancelled: false,
    cancellationDate: '',
    cancellationReason: '',
    changeOrders: [{ id: 1, date: daysAgo(30), description: 'Bad wood replacement', amount: 800 }],
    intake: { contractReceived: true, uploadedJN: true, estimateApproved: true, budgetCreated: true, invoiceCreated: true, fileCreated: true },
    permits: { required: false, type: '', submittedDate: null, approvedDate: null, notes: '' },
    notes: 'Roof complete, waiting on gutters.',
    decisionNeeded: '',
    scopes: [
      {
        id: 'S-1003-A',
        type: 'Roofs',
        measurer: 'Mike',
        measureRequested: daysAgo(44),
        measureCompleted: daysAgo(42),
        materialListReceived: daysAgo(42),
        dateOrdered: daysAgo(40),
        vendor: 'Beacon',
        materialETA: daysAgo(30),
        materialsIn: daysAgo(29),
        crew: 'Team B',
        scheduledInstallDate: daysAgo(20),
        completionDate: daysAgo(18),
        specs: { Shingle: 'Architectural', Color: 'Charcoal', 'Drip Edge': 'Black' },
        notes: 'Completed.',
      },
      {
        id: 'S-1003-B',
        type: 'Gutters',
        measurer: 'Mike',
        measureRequested: daysAgo(44),
        measureCompleted: daysAgo(42),
        materialListReceived: daysAgo(42),
        dateOrdered: daysAgo(40),
        vendor: 'Local Supply',
        materialETA: daysAgo(10),
        materialsIn: daysAgo(8),
        crew: '',
        scheduledInstallDate: null,
        completionDate: null,
        specs: { Size: '6 inch', Color: 'White', Guards: 'Yes' },
        notes: 'Materials are here, needs to be scheduled.',
      },
    ],
  },
];

const PRODUCT_CATEGORIES = ['Roofs', 'Siding', 'Windows', 'Decks', 'Gutters', 'Doors', 'Trim', 'Repairs', 'Misc'];
const TRADE_BOARD_COLUMNS = ['Roofs', 'Repairs', 'Siding', 'Trim', 'Gutters', 'Windows', 'Decks', 'Doors', 'Misc'];
const REGIONS = ['All', 'Virginia', 'Carolina'];
const PERIODS = ['MTD', 'QTD', 'YTD', 'All'];
const VIEWS = {
  CENTER: 'center',
  MEASURE: 'measure',
  BOTTLENECKS: 'bottlenecks',
  SALES: 'sales',
  CRITICAL: 'critical',
  BOOK: 'book',
  WALLBOARD: 'wallboard',
};

const WALLBOARD_COLUMNS = [
  'Needs Measurer',
  'Measure / List Needed',
  'Ready to Order',
  'Ordered / Waiting Materials',
  'Materials In / Ready to Schedule',
  'Scheduled',
  'Collection / Closeout',
];

const UI_STORAGE_KEY = 'mlb-dashboard-ui-v1';

const VIEW_QUERY_MAP = {
  wallboard: VIEWS.WALLBOARD,
  book: VIEWS.BOOK,
  sales: VIEWS.SALES,
  bottlenecks: VIEWS.BOTTLENECKS,
  center: VIEWS.CENTER,
  measure: VIEWS.MEASURE,
  critical: VIEWS.CRITICAL,
};

const MAIN_AREAS = {
  PRODUCTION: 'production',
  BOTTLENECKS: 'bottlenecks',
  SALES: 'sales',
  WALLBOARD: 'wallboard',
};

const PRODUCTION_MODES = {
  CUSTOMER: 'customer',
  BOOK: 'book',
  MEETING: 'meeting',
};

const BOTTLENECK_MODES = {
  ALL: 'all',
  MEASUREMENT: 'measurement',
};

const MAIN_NAV_ITEMS = [
  { id: MAIN_AREAS.PRODUCTION, label: 'Production' },
  { id: MAIN_AREAS.BOTTLENECKS, label: 'Bottlenecks' },
  { id: MAIN_AREAS.SALES, label: 'Sales' },
  { id: MAIN_AREAS.WALLBOARD, label: 'TV Wallboard' },
];

const PRODUCTION_NAV_ITEMS = [
  { id: PRODUCTION_MODES.CUSTOMER, label: 'Customer' },
  { id: PRODUCTION_MODES.BOOK, label: 'Book' },
  { id: PRODUCTION_MODES.MEETING, label: 'Meeting' },
];

const BOTTLENECK_NAV_ITEMS = [
  { id: BOTTLENECK_MODES.ALL, label: 'All' },
  { id: BOTTLENECK_MODES.MEASUREMENT, label: 'Measurement' },
];

const viewToNavigation = (view) => {
  switch (view) {
    case VIEWS.BOOK:
      return { mainArea: MAIN_AREAS.PRODUCTION, productionMode: PRODUCTION_MODES.BOOK, bottleneckMode: BOTTLENECK_MODES.ALL };
    case VIEWS.CRITICAL:
      return { mainArea: MAIN_AREAS.PRODUCTION, productionMode: PRODUCTION_MODES.MEETING, bottleneckMode: BOTTLENECK_MODES.ALL };
    case VIEWS.MEASURE:
      return { mainArea: MAIN_AREAS.BOTTLENECKS, productionMode: PRODUCTION_MODES.CUSTOMER, bottleneckMode: BOTTLENECK_MODES.MEASUREMENT };
    case VIEWS.BOTTLENECKS:
      return { mainArea: MAIN_AREAS.BOTTLENECKS, productionMode: PRODUCTION_MODES.CUSTOMER, bottleneckMode: BOTTLENECK_MODES.ALL };
    case VIEWS.SALES:
      return { mainArea: MAIN_AREAS.SALES, productionMode: PRODUCTION_MODES.CUSTOMER, bottleneckMode: BOTTLENECK_MODES.ALL };
    case VIEWS.WALLBOARD:
      return { mainArea: MAIN_AREAS.WALLBOARD, productionMode: PRODUCTION_MODES.CUSTOMER, bottleneckMode: BOTTLENECK_MODES.ALL };
    case VIEWS.CENTER:
    default:
      return { mainArea: MAIN_AREAS.PRODUCTION, productionMode: PRODUCTION_MODES.CUSTOMER, bottleneckMode: BOTTLENECK_MODES.ALL };
  }
};

const navigationToView = (mainArea, productionMode, bottleneckMode) => {
  if (mainArea === MAIN_AREAS.PRODUCTION) {
    if (productionMode === PRODUCTION_MODES.BOOK) return VIEWS.BOOK;
    if (productionMode === PRODUCTION_MODES.MEETING) return VIEWS.CRITICAL;
    return VIEWS.CENTER;
  }

  if (mainArea === MAIN_AREAS.BOTTLENECKS) {
    return bottleneckMode === BOTTLENECK_MODES.MEASUREMENT ? VIEWS.MEASURE : VIEWS.BOTTLENECKS;
  }

  if (mainArea === MAIN_AREAS.SALES) return VIEWS.SALES;
  if (mainArea === MAIN_AREAS.WALLBOARD) return VIEWS.WALLBOARD;
  return VIEWS.CENTER;
};

const getInitialNavigation = () => {
  const params = new URLSearchParams(window.location.search);
  const areaParam = params.get('area');
  const modeParam = params.get('mode');
  const filterParam = params.get('filter');
  const viewParam = params.get('view');

  if (VIEW_QUERY_MAP[viewParam]) {
    return viewToNavigation(VIEW_QUERY_MAP[viewParam]);
  }

  if (Object.values(MAIN_AREAS).includes(areaParam)) {
    return {
      mainArea: areaParam,
      productionMode: Object.values(PRODUCTION_MODES).includes(modeParam) ? modeParam : PRODUCTION_MODES.CUSTOMER,
      bottleneckMode: Object.values(BOTTLENECK_MODES).includes(filterParam) ? filterParam : BOTTLENECK_MODES.ALL,
    };
  }

  try {
    const saved = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || '{}');
    if (Object.values(MAIN_AREAS).includes(saved.mainArea)) {
      return {
        mainArea: saved.mainArea,
        productionMode: Object.values(PRODUCTION_MODES).includes(saved.productionMode) ? saved.productionMode : PRODUCTION_MODES.CUSTOMER,
        bottleneckMode: Object.values(BOTTLENECK_MODES).includes(saved.bottleneckMode) ? saved.bottleneckMode : BOTTLENECK_MODES.ALL,
      };
    }
    if (Object.values(VIEWS).includes(saved.currentView)) {
      return viewToNavigation(saved.currentView);
    }
  } catch {
    return viewToNavigation(VIEWS.CENTER);
  }

  return viewToNavigation(VIEWS.CENTER);
};

const WHITEBOARD_STATUS_KEY = [
  { label: 'Measure date', field: 'measureCompleted', fallback: 'measureRequested', className: 'bg-purple-100 text-purple-800 border-purple-300' },
  { label: 'Order date', field: 'dateOrdered', className: 'bg-teal-100 text-teal-800 border-teal-300' },
  { label: 'Material ETA', field: 'materialETA', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  { label: 'Materials IN', field: 'materialsIn', className: 'bg-orange-100 text-orange-800 border-orange-300' },
  { label: 'Scheduled', field: 'scheduledInstallDate', className: 'bg-pink-100 text-pink-800 border-pink-300' },
];

const salesActivity = {
  Jack: { leads: 38, opportunities: 28 },
  Sarah: { leads: 31, opportunities: 24 },
  Mike: { leads: 27, opportunities: 19 },
};

const emptyProject = () => ({
  id: `P-${Date.now().toString().slice(-5)}`,
  customer: '',
  city: '',
  region: 'Virginia',
  phone: '',
  dateSold: todayISO(),
  salesperson: '',
  leadSource: '',
  paymentType: 'Finance',
  originalAmount: '',
  deposit: '',
  collected: false,
  thankYouSent: false,
  cancelled: false,
  cancellationDate: '',
  cancellationReason: '',
  changeOrders: [],
  intake: { contractReceived: false, uploadedJN: false, estimateApproved: false, budgetCreated: false, invoiceCreated: false, fileCreated: false },
  permits: { required: false, type: '', submittedDate: '', approvedDate: '', notes: '' },
  notes: '',
  decisionNeeded: '',
  scopes: [],
});

const emptyScope = () => ({
  id: `S-${Date.now().toString().slice(-5)}`,
  type: 'Roofs',
  measurer: '',
  measureRequested: '',
  measureCompleted: '',
  materialListReceived: '',
  dateOrdered: '',
  vendor: '',
  materialETA: '',
  materialsIn: '',
  crew: '',
  scheduledInstallDate: '',
  completionDate: '',
  specs: {},
  notes: '',
});

const getRevisedAmount = (project) =>
  Number(project.originalAmount) + (project.changeOrders?.reduce((sum, co) => sum + Number(co.amount || 0), 0) || 0);

const isProjectClosed = (project) =>
  !project.cancelled && project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate) && project.collected && project.thankYouSent;

const getScopeStatus = (scope) => {
  if (scope.completionDate) return { label: 'Completed', color: 'bg-gray-200 text-gray-800 border-gray-300', stage: 7 };
  if (scope.scheduledInstallDate) return { label: 'Scheduled', color: 'bg-pink-100 text-pink-700 border-pink-200', stage: 6 };
  if (scope.materialsIn) return { label: 'Materials In', color: 'bg-orange-100 text-orange-700 border-orange-200', stage: 5 };
  if (scope.materialETA) return { label: 'Material ETA', color: 'bg-blue-100 text-blue-700 border-blue-200', stage: 4 };
  if (scope.dateOrdered) return { label: 'Ordered', color: 'bg-teal-100 text-teal-700 border-teal-200', stage: 3 };
  if (scope.materialListReceived) return { label: 'Ready to Order', color: 'bg-green-100 text-green-800 border-green-200', stage: 2 };
  if (scope.measureCompleted) return { label: 'Needs List', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', stage: 1 };
  if (scope.measurer || scope.measureRequested) return { label: 'Measure Assigned', color: 'bg-purple-100 text-purple-700 border-purple-200', stage: 0 };
  return { label: 'Needs Measurer', color: 'bg-red-50 text-red-700 border-red-200', stage: -1 };
};

const calculateNextAction = (scope, project) => {
  if (scope.completionDate) return project?.collected ? 'Send thank-you / close file' : 'Collect / fund balance';
  if (scope.scheduledInstallDate) return 'Execute installation';
  if (scope.materialsIn) return 'Schedule customer and assign crew';
  if (scope.materialETA) return 'Track material delivery';
  if (scope.dateOrdered) return 'Confirm material ETA';
  if (scope.materialListReceived) return 'Order materials';
  if (scope.measureCompleted) return 'Submit material list';
  if (scope.measurer || scope.measureRequested) return 'Complete measurement';
  return 'Assign measurer';
};

const getWhiteboardDateBadges = (scope) =>
  WHITEBOARD_STATUS_KEY.map((item) => ({ ...item, value: scope[item.field] || (item.fallback ? scope[item.fallback] : '') })).filter((item) => item.value);

const getScopeAlerts = (project, scope) => {
  if (project.cancelled || isProjectClosed(project) || scope.completionDate) return [];
  const today = todayISO();
  const alerts = [];
  const measureAnchor = scope.measureRequested || project.dateSold;

  if (!scope.measurer && project.dateSold && daysBetween(today, project.dateSold) > 1) {
    alerts.push({ type: 'Needs Measurer', daysStuck: daysBetween(today, project.dateSold) });
  }

  if ((scope.measurer || scope.measureRequested) && !scope.measureCompleted && measureAnchor && daysBetween(today, measureAnchor) > 3) {
    alerts.push({ type: 'Measurement SLA', daysStuck: daysBetween(today, measureAnchor) });
  }

  if (scope.measureCompleted && !scope.materialListReceived && daysBetween(today, scope.measureCompleted) > 2) {
    alerts.push({ type: 'Material List Needed', daysStuck: daysBetween(today, scope.measureCompleted) });
  }

  if (scope.materialListReceived && !scope.dateOrdered && daysBetween(today, scope.materialListReceived) > 2) {
    alerts.push({ type: 'Needs Order', daysStuck: daysBetween(today, scope.materialListReceived) });
  }

  if (scope.materialETA && !scope.materialsIn && scope.materialETA < today) {
    alerts.push({ type: 'Materials Late', daysStuck: daysBetween(today, scope.materialETA) });
  }

  if (scope.materialsIn && !scope.scheduledInstallDate && daysBetween(today, scope.materialsIn) > 3) {
    alerts.push({ type: 'Needs Scheduling', daysStuck: daysBetween(today, scope.materialsIn) });
  }

  if (scope.scheduledInstallDate && !scope.completionDate && scope.scheduledInstallDate < today) {
    alerts.push({ type: 'Install Overdue', daysStuck: daysBetween(today, scope.scheduledInstallDate) });
  }

  return alerts;
};

const getProjectAlerts = (project) => {
  const scopeAlerts = project.scopes.flatMap((scope) => getScopeAlerts(project, scope).map((alert) => ({ ...alert, scope })));
  if (!project.cancelled && project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate) && !project.collected) {
    scopeAlerts.push({ type: 'Collection Needed', daysStuck: Math.max(...project.scopes.map((scope) => daysBetween(todayISO(), scope.completionDate || todayISO()))), scope: null });
  }
  if (project.decisionNeeded) {
    scopeAlerts.push({ type: 'Decision Needed', daysStuck: daysBetween(todayISO(), project.dateSold), scope: null });
  }
  return scopeAlerts;
};

const getWallboardColumn = (project, scope) => {
  if (project.cancelled || isProjectClosed(project)) return null;
  if (scope.completionDate && !project.collected) return 'Collection / Closeout';
  if (scope.scheduledInstallDate && !scope.completionDate) return 'Scheduled';
  if (scope.materialsIn && !scope.scheduledInstallDate) return 'Materials In / Ready to Schedule';
  if (scope.dateOrdered || scope.materialETA) return 'Ordered / Waiting Materials';
  if (scope.materialListReceived && !scope.dateOrdered) return 'Ready to Order';
  if (scope.measurer || scope.measureRequested || scope.measureCompleted) return 'Measure / List Needed';
  return 'Needs Measurer';
};

const csvEscape = (value) => {
  const stringValue = value === null || value === undefined ? '' : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
};

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const isInPeriod = (dateStr, period) => {
  if (period === 'All' || !dateStr) return true;
  const date = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);

  if (period === 'MTD') return date >= monthStart;
  if (period === 'QTD') return date >= quarterStart;
  if (period === 'YTD') return date >= yearStart;
  return true;
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs ${className}`}>
    {children}
  </span>
);

const MetricCard = ({ label, value, detail, tone = 'bg-white', helpId, helpIcon }) => (
  <div data-help-id={helpId} className={`${tone} rounded-lg border border-slate-200 p-5 shadow-sm`}>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <h3 className="mt-2 text-3xl font-bold text-slate-950">{value}{helpIcon}</h3>
    {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
  </div>
);

const WhiteboardStatusKey = ({ dark = false, helpId }) => (
  <div data-help-id={helpId} className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide">
    {WHITEBOARD_STATUS_KEY.map((item) => (
      <span key={item.label} className={`rounded border px-2 py-1 ${item.className}`}>{item.label}</span>
    ))}
    <span className={`rounded border px-2 py-1 ${dark ? 'border-red-500 bg-red-500 text-white' : 'border-red-300 bg-red-100 text-red-800'}`}>Red urgent/stuck</span>
  </div>
);

const ProjectModal = ({ project, onClose, onSave, helpIconsEnabled = false, onOpenHelpTopic = () => {} }) => {
  const [formData, setFormData] = useState(project || emptyProject());
  const [activeTab, setActiveTab] = useState('overview');
  const [editingScope, setEditingScope] = useState(null);
  const [newChangeOrder, setNewChangeOrder] = useState({ date: todayISO(), description: '', amount: '' });
  const Help = ({ id }) => <HelpIcon item={helpById[id]} enabled={helpIconsEnabled} onOpenTopic={onOpenHelpTopic} />;

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const updateIntake = (field, value) => setFormData((prev) => ({ ...prev, intake: { ...prev.intake, [field]: value } }));
  const updatePermit = (field, value) => setFormData((prev) => ({ ...prev, permits: { ...prev.permits, [field]: value } }));

  const saveScope = (scopeData) => {
    setFormData((prev) => {
      const scopeWithDefaults = { ...emptyScope(), ...scopeData, id: scopeData.id || `S-${Date.now().toString().slice(-5)}`, specs: scopeData.specs || {} };
      const exists = prev.scopes.some((scope) => scope.id === scopeWithDefaults.id);
      return {
        ...prev,
        scopes: exists ? prev.scopes.map((scope) => (scope.id === scopeWithDefaults.id ? scopeWithDefaults : scope)) : [...prev.scopes, scopeWithDefaults],
      };
    });
    setEditingScope(null);
  };

  const deleteScope = (scopeId) => {
    setFormData((prev) => ({ ...prev, scopes: prev.scopes.filter((scope) => scope.id !== scopeId) }));
    setEditingScope(null);
  };

  const addChangeOrder = () => {
    if (!newChangeOrder.description || !newChangeOrder.amount) return;
    setFormData((prev) => ({
      ...prev,
      changeOrders: [...prev.changeOrders, { ...newChangeOrder, id: Date.now(), amount: Number(newChangeOrder.amount) }],
    }));
    setNewChangeOrder({ date: todayISO(), description: '', amount: '' });
  };

  const updateEditingSpecKey = (oldKey, newKey) => {
    setEditingScope((prev) => {
      const specs = { ...(prev.specs || {}) };
      const value = specs[oldKey];
      delete specs[oldKey];
      specs[newKey] = value;
      return { ...prev, specs };
    });
  };

  const updateEditingSpecValue = (key, value) => {
    setEditingScope((prev) => ({ ...prev, specs: { ...(prev.specs || {}), [key]: value } }));
  };

  const addEditingSpec = () => {
    setEditingScope((prev) => {
      const specs = { ...(prev.specs || {}) };
      let index = Object.keys(specs).length + 1;
      let key = `Spec ${index}`;
      while (specs[key] !== undefined) {
        index += 1;
        key = `Spec ${index}`;
      }
      return { ...prev, specs: { ...specs, [key]: '' } };
    });
  };

  const removeEditingSpec = (key) => {
    setEditingScope((prev) => {
      const specs = { ...(prev.specs || {}) };
      delete specs[key];
      return { ...prev, specs };
    });
  };

  const PrintView = () => (
    <div className="bg-white p-8 font-serif text-black print:m-0 print:p-0" id="printable-area">
      <div className="mb-6 border-b-2 border-black pb-4 text-center">
        <h1 className="text-3xl font-black uppercase tracking-widest">Major League Builders</h1>
        <p className="text-lg">Project File: {formData.customer || formData.id}</p>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-8">
        <div>
          <h3 className="mb-2 border-b border-gray-300 font-bold">Customer Details</h3>
          <p><strong>Name:</strong> {formData.customer}</p>
          <p><strong>Location:</strong> {formData.city}, {formData.region}</p>
          <p><strong>Phone:</strong> {formData.phone}</p>
        </div>
        <div>
          <h3 className="mb-2 border-b border-gray-300 font-bold">Contract Details</h3>
          <p><strong>Date Sold:</strong> {formatDate(formData.dateSold)}</p>
          <p><strong>Salesperson:</strong> {formData.salesperson}</p>
          <p><strong>Original Total:</strong> {currency(formData.originalAmount)}</p>
          <p><strong>Revised Total:</strong> {currency(getRevisedAmount(formData))}</p>
          {formData.cancelled && <p><strong>Cancelled:</strong> {formatDate(formData.cancellationDate)} — {formData.cancellationReason}</p>}
        </div>
      </div>
      <h3 className="mb-4 border-b border-gray-300 text-xl font-bold">Work Scopes ({formData.scopes.length})</h3>
      {formData.scopes.map((scope) => (
        <div key={scope.id} className="mb-6 border border-gray-200 bg-gray-50 p-4">
          <h4 className="mb-2 text-lg font-bold">{scope.type}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p><strong>Measurer:</strong> {scope.measurer || 'TBD'}</p><p><strong>Measure Requested:</strong> {formatDate(scope.measureRequested)}</p><p><strong>Measure Done:</strong> {formatDate(scope.measureCompleted)}</p></div>
            <div><p><strong>Crew:</strong> {scope.crew || 'TBD'}</p><p><strong>Vendor:</strong> {scope.vendor || 'TBD'}</p><p><strong>Status:</strong> {getScopeStatus(scope).label}</p></div>
          </div>
          {scope.specs && Object.keys(scope.specs).length > 0 && (
            <div className="mt-3 text-sm">
              <strong>Specs: </strong>
              {Object.entries(scope.specs).map(([key, value]) => `${key}: ${value}`).join(' | ')}
            </div>
          )}
          <p className="mt-3 text-sm"><strong>Notes:</strong> {scope.notes}</p>
        </div>
      ))}
      <div className="mt-8 border-t-2 border-black pt-4 text-sm">
        <p><strong>Admin Notes:</strong> {formData.notes}</p>
        <p><strong>Decision Needed:</strong> {formData.decisionNeeded}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" data-help-id="modal-project-file">
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{project ? `Project: ${formData.customer || formData.id}` : 'New Customer Project'}<Help id="modal-project-file" /></h2>
            <p className="text-sm font-medium text-slate-500">ID: {formData.id} {formData.city ? `| ${formData.city}` : ''}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="hidden rounded-lg bg-slate-200 p-2 text-slate-700 hover:bg-slate-300 md:block" aria-label="Print project file">
              <Printer size={20} />
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200" aria-label="Close project file">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto border-b border-slate-200 bg-slate-50 px-6">
          {[
            { id: 'overview', label: 'Overview & Intake' },
            { id: 'scopes', label: 'Work Scopes', badge: formData.scopes.length },
            { id: 'financials', label: 'Financials & Changes' },
            { id: 'print', label: 'Print View' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              data-help-id={tab.id === 'overview' ? 'modal-overview-tab' : tab.id === 'scopes' ? 'modal-scopes-tab' : tab.id === 'financials' ? 'modal-financials-tab' : undefined}
              className={`whitespace-nowrap border-b-2 py-3 text-sm font-bold transition-colors ${
                activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{tab.badge}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center font-bold text-slate-800"><User size={18} className="mr-2 text-blue-500" /> Customer Details</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Customer Name<input type="text" value={formData.customer} onChange={(event) => updateField('customer', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900" /></label>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">City<input type="text" value={formData.city} onChange={(event) => updateField('city', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900" /></label>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Region<select value={formData.region} onChange={(event) => updateField('region', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"><option>Virginia</option><option>Carolina</option></select></label>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Phone<input type="text" value={formData.phone} onChange={(event) => updateField('phone', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900" /></label>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center font-bold text-slate-800"><FileText size={18} className="mr-2 text-blue-500" /> Administrative & Permits</h3>
                  <div className="mb-4 grid grid-cols-1 gap-4 border-b border-slate-100 pb-4 sm:grid-cols-2">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Salesperson<input type="text" value={formData.salesperson} onChange={(event) => updateField('salesperson', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900" /></label>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Date Sold<input type="date" value={formData.dateSold} onChange={(event) => updateField('dateSold', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900" /></label>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Lead Source<input type="text" value={formData.leadSource} onChange={(event) => updateField('leadSource', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900" /></label>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Payment<select value={formData.paymentType} onChange={(event) => updateField('paymentType', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"><option>Finance</option><option>Cash</option><option>Check</option><option>Card</option><option>Other</option></select></label>
                  </div>
                  <div className="space-y-3" data-help-id="modal-permit-tracking">
                    <h4 className="text-sm font-bold text-slate-700">Permit Tracking<Help id="modal-permit-tracking" /></h4>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={formData.permits.required} onChange={(event) => updatePermit('required', event.target.checked)} className="rounded border-slate-300 text-blue-600" /> Permit Required for Project</label>
                    {formData.permits.required && (
                      <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                        <label className="block text-xs font-bold uppercase text-slate-500">Type<input type="text" value={formData.permits.type} onChange={(event) => updatePermit('type', event.target.value)} className="mt-1 w-full rounded border border-slate-300 p-1.5 text-sm" /></label>
                        <label className="block text-xs font-bold uppercase text-slate-500">Submitted<input type="date" value={formData.permits.submittedDate || ''} onChange={(event) => updatePermit('submittedDate', event.target.value)} className="mt-1 w-full rounded border border-slate-300 p-1.5 text-sm" /></label>
                        <label className="block text-xs font-bold uppercase text-slate-500">Approved<input type="date" value={formData.permits.approvedDate || ''} onChange={(event) => updatePermit('approvedDate', event.target.value)} className="mt-1 w-full rounded border border-slate-300 p-1.5 text-sm" /></label>
                        <label className="block text-xs font-bold uppercase text-slate-500 sm:col-span-3">Permit Notes<textarea value={formData.permits.notes || ''} onChange={(event) => updatePermit('notes', event.target.value)} className="mt-1 min-h-[70px] w-full rounded border border-slate-300 p-1.5 text-sm normal-case" /></label>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-lg border border-blue-100 bg-blue-50 p-5 shadow-sm" data-help-id="modal-intake-checklist">
                  <h3 className="mb-4 flex items-center font-bold text-blue-900"><CheckCircle2 size={18} className="mr-2 text-blue-600" /> Intake Checklist<Help id="modal-intake-checklist" /></h3>
                  <div className="space-y-2">
                    {[
                      { key: 'contractReceived', label: 'Contract Received' },
                      { key: 'uploadedJN', label: 'Uploaded to JobNimbus' },
                      { key: 'estimateApproved', label: 'Estimate Approved' },
                      { key: 'budgetCreated', label: 'Starter Budget Created' },
                      { key: 'invoiceCreated', label: 'Invoice Created' },
                      { key: 'fileCreated', label: 'Physical Folder Created' },
                    ].map((item) => (
                      <label key={item.key} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 text-sm font-medium text-slate-800 transition-colors hover:bg-blue-100/50">
                        <input type="checkbox" checked={formData.intake[item.key]} onChange={(event) => updateIntake(item.key, event.target.checked)} className="h-4 w-4 rounded border-blue-300 text-blue-600" />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-2 font-bold text-slate-800" data-help-id="modal-meeting-notes">Meeting Notes<Help id="modal-meeting-notes" /></h3>
                  <textarea value={formData.decisionNeeded} onChange={(event) => updateField('decisionNeeded', event.target.value)} placeholder="Decision needed for the weekly sync..." className="min-h-[80px] w-full rounded-md border border-slate-300 p-2 text-sm" />
                  <h3 className="mb-2 mt-4 font-bold text-slate-800" data-help-id="modal-general-notes">General Notes<Help id="modal-general-notes" /></h3>
                  <textarea value={formData.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Customer, supplier, permit, or production notes..." className="min-h-[90px] w-full rounded-md border border-slate-300 p-2 text-sm" />
                </section>
              </div>
            </div>
          )}

          {activeTab === 'scopes' && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center" data-help-id="modal-scopes-tab">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Project Work Scopes<Help id="modal-scopes-tab" /></h3>
                  <p className="text-sm text-slate-500">Break this project down by trade or product, with its own measure, order, material, schedule, crew, and specs.</p>
                </div>
                <button type="button" onClick={() => setEditingScope(emptyScope())} className="flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                  <Plus size={16} className="mr-2" /> Add Scope
                </button>
              </div>

              {formData.scopes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center text-slate-400">
                  <Wrench size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No work scopes added yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {formData.scopes.map((scope) => {
                    const status = getScopeStatus(scope);
                    return (
                      <div key={scope.id} className="rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:border-blue-400">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
                          <h4 className="text-lg font-black text-slate-800">{scope.type}</h4>
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-y-3 p-4 text-sm">
                          <div><span className="block text-xs font-bold uppercase text-slate-500">Measurer</span>{scope.measurer || 'TBD'}</div>
                          <div><span className="block text-xs font-bold uppercase text-slate-500">Measure Requested</span>{formatDate(scope.measureRequested)}</div>
                          <div><span className="block text-xs font-bold uppercase text-slate-500">Measure Done</span>{formatDate(scope.measureCompleted)}</div>
                          <div><span className="block text-xs font-bold uppercase text-slate-500">Order Date</span>{formatDate(scope.dateOrdered)}</div>
                          <div><span className="block text-xs font-bold uppercase text-slate-500">Material ETA</span>{formatDate(scope.materialETA)}</div>
                          <div><span className="block text-xs font-bold uppercase text-slate-500">Sub / Crew</span>{scope.crew || 'TBD'}</div>
                        </div>
                        {Object.keys(scope.specs || {}).length > 0 && (
                          <div className="px-4 pb-3 text-xs text-slate-500">
                            <span className="font-bold uppercase">Specs:</span> {Object.entries(scope.specs).map(([key, value]) => `${key}: ${value}`).join(' | ')}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-3">
                          <span className="text-xs font-bold text-slate-500">Next: <span className="text-blue-600">{calculateNextAction(scope, formData)}</span></span>
                          <button type="button" onClick={() => setEditingScope({ ...emptyScope(), ...scope, specs: scope.specs || {} })} className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-600 hover:text-blue-800">Edit</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="max-w-4xl space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">Original Contract</span>
                  <input type="number" value={formData.originalAmount} onChange={(event) => updateField('originalAmount', event.target.value)} className="w-full rounded border border-slate-300 p-2 text-xl font-black text-slate-800" />
                </label>
                <label className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">Deposit</span>
                  <input type="number" value={formData.deposit} onChange={(event) => updateField('deposit', event.target.value)} className="w-full rounded border border-slate-300 p-2 text-xl font-black text-slate-800" />
                </label>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-center shadow-sm">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-600">Current Revised Total</p>
                  <p className="text-2xl font-black text-blue-900">{currency(getRevisedAmount(formData))}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" data-help-id="modal-financial-change-orders">
                <div className="border-b border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-bold text-slate-800">Change Orders Ledger<Help id="modal-financial-change-orders" /></h3>
                </div>
                <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 md:grid-cols-[150px_1fr_140px_auto]">
                  <input type="date" value={newChangeOrder.date} onChange={(event) => setNewChangeOrder((prev) => ({ ...prev, date: event.target.value }))} className="rounded border border-slate-300 p-2 text-sm" />
                  <input type="text" value={newChangeOrder.description} onChange={(event) => setNewChangeOrder((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" className="rounded border border-slate-300 p-2 text-sm" />
                  <input type="number" value={newChangeOrder.amount} onChange={(event) => setNewChangeOrder((prev) => ({ ...prev, amount: event.target.value }))} placeholder="Amount" className="rounded border border-slate-300 p-2 text-sm" />
                  <button type="button" onClick={addChangeOrder} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Add</button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                    <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {formData.changeOrders.length === 0 ? (
                      <tr><td colSpan="3" className="px-4 py-6 text-center italic text-slate-400">No change orders recorded.</td></tr>
                    ) : (
                      formData.changeOrders.map((co) => (
                        <tr key={co.id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3">{formatDate(co.date)}</td><td className="px-4 py-3">{co.description}</td><td className="px-4 py-3 text-right font-medium text-slate-900">{currency(co.amount)}</td></tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-3" data-help-id="modal-collected-funded">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={formData.collected} onChange={(event) => updateField('collected', event.target.checked)} /> Collected / Funded<Help id="modal-collected-funded" /></label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={formData.thankYouSent} onChange={(event) => updateField('thankYouSent', event.target.checked)} /> Thank-you sent</label>
                  <label className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700">
                    <input
                      type="checkbox"
                      checked={formData.cancelled}
                      onChange={(event) => setFormData((prev) => ({
                        ...prev,
                        cancelled: event.target.checked,
                        cancellationDate: event.target.checked && !prev.cancellationDate ? todayISO() : prev.cancellationDate,
                      }))}
                    /> Cancelled
                  </label>
                </div>
                {formData.cancelled && (
                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-red-200 bg-red-50 p-4 sm:grid-cols-2" data-help-id="modal-cancellation-fields">
                    <label className="block text-xs font-bold uppercase tracking-wide text-red-700">Cancellation Date<input type="date" value={formData.cancellationDate || ''} onChange={(event) => updateField('cancellationDate', event.target.value)} className="mt-1 w-full rounded-md border border-red-200 p-2 text-sm text-slate-900" /></label>
                    <label className="block text-xs font-bold uppercase tracking-wide text-red-700 sm:col-span-2">Cancellation Reason<textarea value={formData.cancellationReason || ''} onChange={(event) => updateField('cancellationReason', event.target.value)} className="mt-1 min-h-[80px] w-full rounded-md border border-red-200 p-2 text-sm normal-case text-slate-900" /></label>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'print' && <PrintView />}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2.5 font-bold text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => onSave(formData)} className="rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-blue-700">Save Project File</button>
        </div>
      </div>

      {editingScope && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <h3 className="text-lg font-bold">Edit Scope: {editingScope.type}</h3>
              <button type="button" onClick={() => setEditingScope(null)} aria-label="Close scope editor"><X size={20} /></button>
            </div>
            <div className="space-y-6 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase text-slate-500">Product Category<select value={editingScope.type} onChange={(event) => setEditingScope({ ...editingScope, type: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm">{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="block text-xs font-bold uppercase text-slate-500">Assigned Crew / Sub<input type="text" value={editingScope.crew || ''} onChange={(event) => setEditingScope({ ...editingScope, crew: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
              </div>

              <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4" data-help-id="modal-scope-measurement-fields">
                <h4 className="border-b border-slate-200 pb-2 font-bold text-slate-800">Measurement & Materials<Help id="modal-scope-measurement-fields" /></h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold uppercase text-slate-500">Measurer<input type="text" value={editingScope.measurer || ''} onChange={(event) => setEditingScope({ ...editingScope, measurer: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Measure Requested<input type="date" value={editingScope.measureRequested || ''} onChange={(event) => setEditingScope({ ...editingScope, measureRequested: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Measure Done<input type="date" value={editingScope.measureCompleted || ''} onChange={(event) => setEditingScope({ ...editingScope, measureCompleted: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Mat. List Received<input type="date" value={editingScope.materialListReceived || ''} onChange={(event) => setEditingScope({ ...editingScope, materialListReceived: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Date Ordered<input type="date" value={editingScope.dateOrdered || ''} onChange={(event) => setEditingScope({ ...editingScope, dateOrdered: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Vendor<input type="text" value={editingScope.vendor || ''} onChange={(event) => setEditingScope({ ...editingScope, vendor: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Material ETA<input type="date" value={editingScope.materialETA || ''} onChange={(event) => setEditingScope({ ...editingScope, materialETA: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                </div>
              </section>

              <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4" data-help-id="modal-scope-production-schedule">
                <h4 className="border-b border-slate-200 pb-2 font-bold text-slate-800">Production Schedule<Help id="modal-scope-production-schedule" /></h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold uppercase text-slate-500">Materials In<input type="date" value={editingScope.materialsIn || ''} onChange={(event) => setEditingScope({ ...editingScope, materialsIn: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Scheduled Install<input type="date" value={editingScope.scheduledInstallDate || ''} onChange={(event) => setEditingScope({ ...editingScope, scheduledInstallDate: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Completion Date<input type="date" value={editingScope.completionDate || ''} onChange={(event) => setEditingScope({ ...editingScope, completionDate: event.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                </div>
              </section>

              <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4" data-help-id="modal-scope-work-order-specs">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-bold text-slate-800">Work Order Specs<Help id="modal-scope-work-order-specs" /></h4>
                  <button type="button" onClick={addEditingSpec} className="rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"><Plus size={12} className="mr-1 inline" /> Add Spec</button>
                </div>
                {Object.entries(editingScope.specs || {}).length === 0 ? (
                  <p className="rounded border border-dashed border-slate-200 py-6 text-center text-sm italic text-slate-400">No specs added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(editingScope.specs || {}).map(([key, value], index) => (
                      <div key={`${key}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <input value={key} onChange={(event) => updateEditingSpecKey(key, event.target.value)} className="rounded border border-slate-300 p-2 text-sm" placeholder="Spec name" />
                        <input value={value} onChange={(event) => updateEditingSpecValue(key, event.target.value)} className="rounded border border-slate-300 p-2 text-sm" placeholder="Value" />
                        <button type="button" onClick={() => removeEditingSpec(key)} className="rounded border border-red-200 px-3 text-red-600"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <label className="block text-xs font-bold uppercase text-slate-500">Scope Notes<textarea value={editingScope.notes || ''} onChange={(event) => setEditingScope({ ...editingScope, notes: event.target.value })} className="mt-1 min-h-[90px] w-full rounded border border-slate-300 p-2 text-sm normal-case" /></label>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
              {formData.scopes.some((scope) => scope.id === editingScope.id) ? (
                <button type="button" onClick={() => deleteScope(editingScope.id)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 size={15} className="mr-1 inline" /> Delete Scope</button>
              ) : <span />}
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingScope(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button>
                <button type="button" onClick={() => saveScope(editingScope)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Save Scope</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function MLBDashboard() {
  const fileInputRef = useRef(null);
  const [projects, setProjects] = useState(() => loadProjects(initialProjects));
  const [initialNavigation] = useState(() => getInitialNavigation());
  const [mainArea, setMainArea] = useState(initialNavigation.mainArea);
  const [productionMode, setProductionMode] = useState(initialNavigation.productionMode);
  const [bottleneckMode, setBottleneckMode] = useState(initialNavigation.bottleneckMode);
  const [regionFilter, setRegionFilter] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || '{}');
      return REGIONS.includes(saved.regionFilter) ? saved.regionFilter : 'All';
    } catch {
      return 'All';
    }
  });
  const [periodFilter, setPeriodFilter] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || '{}');
      return PERIODS.includes(saved.periodFilter) ? saved.periodFilter : 'YTD';
    } catch {
      return 'YTD';
    }
  });
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);
  const [activeHelpTopicId, setActiveHelpTopicId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HELP_STORAGE_KEY) || '{}');
      return saved.lastOpenedHelpTopic || 'global-main-nav';
    } catch {
      return 'global-main-nav';
    }
  });
  const [helpIconsEnabled, setHelpIconsEnabled] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HELP_STORAGE_KEY) || '{}');
      return Boolean(saved.helpIconsEnabled);
    } catch {
      return false;
    }
  });
  const [completedTours, setCompletedTours] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HELP_STORAGE_KEY) || '{}');
      return Array.isArray(saved.completedTours) ? saved.completedTours : [];
    } catch {
      return [];
    }
  });
  const [activeTour, setActiveTour] = useState(null);
  const [wallboardDisplayMode, setWallboardDisplayMode] = useState(() => new URLSearchParams(window.location.search).get('display') === '1');
  const [wallboardMode, setWallboardMode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || '{}');
      return ['production', 'trade'].includes(saved.wallboardMode) ? saved.wallboardMode : 'production';
    } catch {
      return 'production';
    }
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState(() => new Set(['P-1001']));
  const currentView = navigationToView(mainArea, productionMode, bottleneckMode);
  const currentHelpMode = mainArea === MAIN_AREAS.PRODUCTION ? productionMode : mainArea === MAIN_AREAS.BOTTLENECKS ? bottleneckMode : null;
  const showHelpIcons = helpIconsEnabled && !(wallboardDisplayMode && currentView === VIEWS.WALLBOARD);
  const Help = ({ id }) => <HelpIcon item={helpById[id]} enabled={showHelpIcons} onOpenTopic={openHelpTopic} />;

  useEffect(() => {
    const timer = window.setInterval(() => setLastUpdated(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ currentView, mainArea, productionMode, bottleneckMode, wallboardMode, regionFilter, periodFilter }));
  }, [currentView, mainArea, productionMode, bottleneckMode, wallboardMode, regionFilter, periodFilter]);

  useEffect(() => {
    localStorage.setItem(HELP_STORAGE_KEY, JSON.stringify({ helpIconsEnabled, completedTours, lastOpenedHelpTopic: activeHelpTopicId }));
  }, [helpIconsEnabled, completedTours, activeHelpTopicId]);

  useEffect(() => {
    if (wallboardDisplayMode && currentView === VIEWS.WALLBOARD) {
      setHelpCenterOpen(false);
      setActiveTour(null);
    }
  }, [wallboardDisplayMode, currentView]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete('view');
    params.set('area', mainArea);
    params.delete('mode');
    params.delete('filter');

    if (mainArea === MAIN_AREAS.PRODUCTION) {
      params.set('mode', productionMode);
    }

    if (mainArea === MAIN_AREAS.BOTTLENECKS) {
      params.set('filter', bottleneckMode);
    }

    if (wallboardDisplayMode) {
      params.set('display', '1');
    } else {
      params.delete('display');
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [mainArea, productionMode, bottleneckMode, wallboardDisplayMode]);

  const openHelpTopic = (topicId) => {
    setActiveHelpTopicId(topicId);
    setHelpCenterOpen(true);
  };

  const startHelpTour = (tour = 'full-dashboard') => {
    setHelpCenterOpen(true);
    setActiveTour(tour);
    setAdminMenuOpen(false);
  };

  const completeHelpTour = (tour) => {
    setCompletedTours((current) => (current.includes(tour) ? current : [...current, tour]));
    setActiveTour(null);
  };

  const navigateToHelpItem = (item) => {
    if (!item) return;
    if (item.area === 'production') {
      setMainArea(MAIN_AREAS.PRODUCTION);
      if (item.mode && Object.values(PRODUCTION_MODES).includes(item.mode)) setProductionMode(item.mode);
      return;
    }
    if (item.area === 'bottlenecks') {
      setMainArea(MAIN_AREAS.BOTTLENECKS);
      if (item.mode && Object.values(BOTTLENECK_MODES).includes(item.mode)) setBottleneckMode(item.mode);
      return;
    }
    if (item.area === 'sales') {
      setMainArea(MAIN_AREAS.SALES);
      return;
    }
    if (item.area === 'wallboard') {
      setMainArea(MAIN_AREAS.WALLBOARD);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const regionMatch = regionFilter === 'All' || project.region === regionFilter;
      const periodMatch = isInPeriod(project.dateSold, periodFilter);
      return regionMatch && periodMatch;
    });
  }, [projects, regionFilter, periodFilter]);

  const flatScopes = useMemo(
    () => filteredProjects.flatMap((project) => project.scopes.map((scope) => ({ project, scope }))),
    [filteredProjects],
  );

  const allAlerts = useMemo(() => {
    const alertsMap = {};

    filteredProjects.forEach((project) => {
      getProjectAlerts(project).forEach((alert) => {
        if (!alertsMap[alert.type]) {
          alertsMap[alert.type] = { count: 0, oldest: 0, totalDays: 0, items: [] };
        }
        alertsMap[alert.type].count += 1;
        alertsMap[alert.type].totalDays += alert.daysStuck;
        alertsMap[alert.type].oldest = Math.max(alertsMap[alert.type].oldest, alert.daysStuck);
        alertsMap[alert.type].items.push({ project, scope: alert.scope, daysStuck: alert.daysStuck });
      });
    });

    return Object.entries(alertsMap)
      .map(([type, data]) => ({
        type,
        count: data.count,
        oldest: data.oldest,
        avgDays: Math.round(data.totalDays / data.count),
        items: data.items.sort((a, b) => b.daysStuck - a.daysStuck),
      }))
      .sort((a, b) => b.oldest - a.oldest);
  }, [filteredProjects]);

  const pipelineMetrics = useMemo(() => {
    const activeProjects = filteredProjects.filter((project) => !project.cancelled && !isProjectClosed(project));
    const completedScopes = flatScopes.filter((item) => item.scope.completionDate && !item.project.cancelled);
    const scheduledScopes = flatScopes.filter((item) => item.scope.scheduledInstallDate && !item.scope.completionDate && !item.project.cancelled);
    const collectionOpen = filteredProjects.filter((project) => !project.cancelled && project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate) && !project.collected).length;
    const totalRevenue = activeProjects.reduce((sum, project) => sum + getRevisedAmount(project), 0);
    const totalDeposits = activeProjects.reduce((sum, project) => sum + Number(project.deposit || 0), 0);
    const avgSoldToDone = completedScopes.length
      ? Math.round(completedScopes.reduce((sum, item) => sum + daysBetween(item.scope.completionDate, item.project.dateSold), 0) / completedScopes.length)
      : 0;

    return {
      activeProjects,
      totalRevenue,
      totalDeposits,
      scheduledCount: scheduledScopes.length,
      collectionOpen,
      alertCount: allAlerts.reduce((sum, group) => sum + group.count, 0),
      avgSoldToDone,
    };
  }, [filteredProjects, flatScopes, allAlerts]);

  const salesStats = useMemo(() => {
    const stats = {};

    filteredProjects.forEach((project) => {
      const name = project.salesperson || 'Unassigned';
      if (!stats[name]) {
        const activity = salesActivity[name] || { leads: 0, opportunities: 0 };
        stats[name] = { name, revenue: 0, deposits: 0, projects: 0, cancelled: 0, scopes: 0, leads: activity.leads, opportunities: activity.opportunities };
      }
      if (project.cancelled) {
        stats[name].cancelled += 1;
        return;
      }
      stats[name].revenue += getRevisedAmount(project);
      stats[name].deposits += Number(project.deposit || 0);
      stats[name].projects += 1;
      stats[name].scopes += project.scopes.length;
    });

    return Object.values(stats)
      .map((rep) => ({
        ...rep,
        avgTicket: rep.projects ? Math.round(rep.revenue / rep.projects) : 0,
        valuePerLead: rep.leads ? Math.round(rep.revenue / rep.leads) : 0,
        closingRate: rep.leads ? rep.projects / rep.leads : 0,
        cancellationRate: rep.projects + rep.cancelled ? rep.cancelled / (rep.projects + rep.cancelled) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects]);

  const wallboardColumns = useMemo(() => {
    const columns = WALLBOARD_COLUMNS.reduce((acc, column) => ({ ...acc, [column]: [] }), {});

    flatScopes.forEach(({ project, scope }) => {
      const column = getWallboardColumn(project, scope);
      if (!column) return;
      const alerts = getScopeAlerts(project, scope);
      const projectAlerts = getProjectAlerts(project).filter((alert) => !alert.scope || alert.scope.id === scope.id);
      const allItemAlerts = [...alerts, ...projectAlerts.filter((alert) => alert.scope === null)];
      const daysActive = daysBetween(todayISO(), project.dateSold);
      const daysStuck = allItemAlerts.length ? Math.max(...allItemAlerts.map((alert) => alert.daysStuck)) : daysActive;
      columns[column].push({ project, scope, alerts: allItemAlerts, daysActive, daysStuck });
    });

    Object.keys(columns).forEach((column) => {
      columns[column].sort((a, b) => {
        const alertDiff = Number(b.alerts.length > 0) - Number(a.alerts.length > 0);
        if (alertDiff) return alertDiff;
        if (b.daysStuck !== a.daysStuck) return b.daysStuck - a.daysStuck;
        return new Date(`${a.project.dateSold}T00:00:00`) - new Date(`${b.project.dateSold}T00:00:00`);
      });
    });

    return columns;
  }, [flatScopes]);

  const tradeBoardColumns = useMemo(() => {
    const columns = TRADE_BOARD_COLUMNS.reduce((acc, column) => ({ ...acc, [column]: [] }), {});
    flatScopes.forEach(({ project, scope }) => {
      if (project.cancelled || isProjectClosed(project)) return;
      const column = TRADE_BOARD_COLUMNS.includes(scope.type) ? scope.type : 'Misc';
      const alerts = getScopeAlerts(project, scope);
      const daysActive = daysBetween(todayISO(), project.dateSold);
      const daysStuck = alerts.length ? Math.max(...alerts.map((alert) => alert.daysStuck)) : daysActive;
      columns[column].push({ project, scope, alerts, daysActive, daysStuck });
    });
    Object.keys(columns).forEach((column) => {
      columns[column].sort((a, b) => Number(b.alerts.length > 0) - Number(a.alerts.length > 0) || b.daysStuck - a.daysStuck);
    });
    return columns;
  }, [flatScopes]);

  const wallboardSalesTotals = useMemo(() => {
    const totalRevenue = salesStats.reduce((sum, rep) => sum + rep.revenue, 0);
    const totalLeads = salesStats.reduce((sum, rep) => sum + rep.leads, 0);
    const totalProjects = salesStats.reduce((sum, rep) => sum + rep.projects, 0);
    const totalCancelled = salesStats.reduce((sum, rep) => sum + rep.cancelled, 0);
    const topRep = salesStats[0];

    return {
      totalRevenue,
      totalLeads,
      totalProjects,
      totalCancelled,
      closeRate: totalLeads ? Math.round((totalProjects / totalLeads) * 100) : 0,
      cancellationRate: totalProjects + totalCancelled ? Math.round((totalCancelled / (totalProjects + totalCancelled)) * 100) : 0,
      topRep,
    };
  }, [salesStats]);

  const criticalPathSpotlight = useMemo(() => {
    const discussionItems = [];

    filteredProjects.forEach((project) => {
      const projectDays = daysBetween(todayISO(), project.dateSold);

      if (project.decisionNeeded) {
        discussionItems.push({
          id: `${project.id}-decision`,
          project,
          scope: null,
          label: 'Decision Needed',
          detail: project.decisionNeeded,
          priority: 100 + projectDays,
        });
      }

      if (!project.cancelled && project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate) && !project.collected) {
        discussionItems.push({
          id: `${project.id}-collection`,
          project,
          scope: null,
          label: 'Collection / Funding',
          detail: 'Completed project is not collected or funded.',
          priority: 90 + projectDays,
        });
      }

      if (project.cancelled) {
        discussionItems.push({
          id: `${project.id}-cancelled`,
          project,
          scope: null,
          label: 'Cancelled',
          detail: project.cancellationReason || 'Cancelled job needs reason/details completed.',
          priority: 40 + projectDays,
        });
      }

      project.scopes.forEach((scope) => {
        getScopeAlerts(project, scope).forEach((alert) => {
          discussionItems.push({
            id: `${project.id}-${scope.id}-${alert.type}`,
            project,
            scope,
            label: alert.type,
            detail: calculateNextAction(scope, project),
            priority: alert.daysStuck,
          });
        });
      });
    });

    return discussionItems.sort((a, b) => b.priority - a.priority).slice(0, 8);
  }, [filteredProjects]);

  const bookRows = useMemo(() => {
    return filteredProjects.flatMap((project) => {
      if (project.scopes.length === 0) {
        return [{ project, scope: null, id: `${project.id}-no-scope` }];
      }
      return project.scopes.map((scope) => ({ project, scope, id: `${project.id}-${scope.id}` }));
    }).sort((a, b) => new Date(`${a.project.dateSold}T00:00:00`) - new Date(`${b.project.dateSold}T00:00:00`));
  }, [filteredProjects]);

  const toggleExpand = (id) => {
    setExpandedProjects((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveProject = (updatedProject) => {
    setProjects((current) => {
      const exists = current.some((project) => project.id === updatedProject.id);
      return exists ? current.map((project) => (project.id === updatedProject.id ? updatedProject : project)) : [updatedProject, ...current];
    });
    setSelectedProject(null);
  };

  const handleResetDemoData = () => {
    if (!window.confirm('Reset all local project data back to the demo dataset? This cannot be undone.')) return;
    resetProjects();
    setProjects(loadProjects(initialProjects));
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const importedProjects = await importProjectsJson(file);
      if (!window.confirm(`Import ${importedProjects.length} projects and replace current local data?`)) return;
      setProjects(importedProjects);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to import backup JSON.');
    }
  };

  const exportCriticalPathCsv = () => {
    const headers = [
      'Project ID',
      'Scope ID',
      'Date Sold',
      'Customer',
      'City',
      'Region',
      'Phone',
      'Salesperson',
      'Lead Source',
      'Payment Type',
      'Original Amount',
      'Revised Amount',
      'Deposit',
      'Scope Type',
      'Measurer',
      'Measure Requested',
      'Measure Completed',
      'Material List Received',
      'Date Ordered',
      'Vendor',
      'Material ETA',
      'Materials In',
      'Scheduled Install',
      'Crew/Sub',
      'Completion Date',
      'Collected/Funded',
      'Thank-you Sent',
      'Cancelled',
      'Cancellation Date',
      'Cancellation Reason',
      'Notes',
      'Scope Notes',
      'Specs',
      'Alerts',
    ];

    const rows = bookRows.map(({ project, scope }) => {
      const alerts = scope ? getScopeAlerts(project, scope) : getProjectAlerts(project);
      return [
        project.id,
        scope?.id || '',
        project.dateSold || '',
        project.customer || '',
        project.city || '',
        project.region || '',
        project.phone || '',
        project.salesperson || '',
        project.leadSource || '',
        project.paymentType || '',
        project.originalAmount || '',
        getRevisedAmount(project),
        project.deposit || '',
        scope?.type || '',
        scope?.measurer || '',
        scope?.measureRequested || '',
        scope?.measureCompleted || '',
        scope?.materialListReceived || '',
        scope?.dateOrdered || '',
        scope?.vendor || '',
        scope?.materialETA || '',
        scope?.materialsIn || '',
        scope?.scheduledInstallDate || '',
        scope?.crew || '',
        scope?.completionDate || '',
        project.collected ? 'Yes' : 'No',
        project.thankYouSent ? 'Yes' : 'No',
        project.cancelled ? 'Yes' : 'No',
        project.cancellationDate || '',
        project.cancellationReason || '',
        project.notes || '',
        scope?.notes || '',
        scope ? Object.entries(scope.specs || {}).map(([key, value]) => `${key}: ${value}`).join(' | ') : '',
        alerts.map((alert) => `${alert.type} (${alert.daysStuck}d)`).join(' | '),
      ];
    });

    downloadCsv(`mlb-critical-path-book-${todayISO()}.csv`, [headers, ...rows]);
  };

  const toggleWallboardDisplayMode = () => {
    setWallboardDisplayMode((enabled) => !enabled);

    if (!wallboardDisplayMode && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    if (wallboardDisplayMode && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const ExecutiveSummary = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5" data-help-id="customer-view-summary">
      <MetricCard label="Active Pipeline" value={currency(pipelineMetrics.totalRevenue)} detail={`${pipelineMetrics.activeProjects.length} active projects`} />
      <MetricCard label="Deposits Held" value={currency(pipelineMetrics.totalDeposits)} detail="Cash collected at sale" />
      <MetricCard label="Open Alerts" value={pipelineMetrics.alertCount} detail="Production bottlenecks" tone={pipelineMetrics.alertCount ? 'bg-red-50' : 'bg-green-50'} />
      <MetricCard label="Scheduled Scopes" value={pipelineMetrics.scheduledCount} detail="Not yet completed" />
      <MetricCard label="Avg Sold to Done" value={`${pipelineMetrics.avgSoldToDone || '-'}d`} detail="Completed scopes only" />
    </div>
  );

  const ProjectCenterView = () => (
    <div className="space-y-4">
      {filteredProjects.map((project) => {
        const isExpanded = expandedProjects.has(project.id);
        const alerts = getProjectAlerts(project);

        return (
          <div key={project.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all" data-help-id="customer-project-card">
            <div onClick={() => toggleExpand(project.id)} className="flex cursor-pointer flex-col justify-between gap-4 p-4 transition-colors hover:bg-slate-50 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-2 ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{project.customer}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                    <span className="flex items-center"><MapPin size={14} className="mr-1" /> {project.city}</span>
                    <span>{project.scopes.length} scopes</span>
                    <span>{project.salesperson || 'Unassigned'}</span>
                    {project.cancelled && <Badge className="border-red-200 bg-red-50 text-red-700">Cancelled</Badge>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 md:ml-auto md:justify-end">
                {alerts.length > 0 && <Badge className="border-amber-200 bg-amber-50 text-amber-700" data-help-id="customer-alert-badge">{alerts.length} attention</Badge>}
                <div className="text-left sm:text-right" data-help-id="customer-current-total">
                  <div className="text-xs font-bold uppercase text-slate-400">Current Total</div>
                  <div className="font-black text-slate-800">{currency(getRevisedAmount(project))}</div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs font-bold uppercase text-slate-400">Active Since</div>
                  <div className="font-bold text-slate-700">{formatDate(project.dateSold)}</div>
                </div>
                <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedProject(project); }} data-help-id="customer-open-file" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800">
                  Open File
                </button>
                <Help id="customer-open-file" />
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 bg-slate-50 p-4 md:pl-16">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {project.scopes.map((scope) => {
                    const status = getScopeStatus(scope);
                    return (
                      <div key={scope.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" data-help-id="customer-scope-card">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <h4 className="font-bold text-slate-800">{scope.type}</h4>
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                        <p className="mb-1 text-xs font-bold uppercase text-slate-500">Next Action</p>
                        <p className="text-sm font-bold text-blue-700">{calculateNextAction(scope, project)}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {getWhiteboardDateBadges(scope).map((badge) => <Badge key={badge.label} className={badge.className}>{badge.label}: {formatDate(badge.value)}</Badge>)}
                        </div>
                        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                          <span>Sub: {scope.crew || 'TBD'}</span>
                          <span>ETA: {formatDate(scope.materialETA)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {project.scopes.length === 0 && <p className="p-2 text-sm italic text-slate-500">No work scopes defined for this project.</p>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const MeasurementQueueView = () => {
    const queue = flatScopes.filter((item) => !item.scope.dateOrdered && !item.scope.completionDate && !item.project.cancelled);

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-indigo-50 p-4" data-help-id="measurement-queue-header">
          <Ruler className="text-indigo-600" size={24} />
          <div>
            <h2 className="text-lg font-bold text-indigo-900">Measurement & Material List Queue<Help id="measurement-queue-header" /></h2>
            <p className="text-sm text-indigo-700">Track the 3-day SLA for getting measurements and material lists submitted.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                {['Customer', 'Scope', 'Sold', 'Measure Requested', 'Days Since Request', 'Measurer', 'Measured?', 'Mat List Rcvd?', 'Action'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.map(({ project, scope }) => {
                const anchor = scope.measureRequested || project.dateSold;
                const days = daysBetween(todayISO(), anchor);
                const isLate = days > 3 && !scope.measureCompleted;
                return (
                  <tr key={`${project.id}-${scope.id}`} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{project.customer}</td>
                    <td className="px-4 py-3 font-medium">{scope.type}</td>
                    <td className="px-4 py-3">{formatDate(project.dateSold)}</td>
                    <td className="px-4 py-3">{formatDate(scope.measureRequested)}</td>
                    <td className="px-4 py-3" data-help-id="measurement-days-since-request"><span className={`rounded px-2 py-1 text-xs font-bold ${isLate ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{days} days</span><Help id="measurement-days-since-request" /></td>
                    <td className="px-4 py-3" data-help-id="measurement-measurer">{scope.measurer || <span className="italic text-amber-500">Unassigned</span>}</td>
                    <td className="px-4 py-3">{scope.measureCompleted ? <CheckCircle2 size={16} className="text-emerald-500" /> : '-'}</td>
                    <td className="px-4 py-3" data-help-id="measurement-material-list-received">{scope.materialListReceived ? <CheckCircle2 size={16} className="text-emerald-500" /> : '-'}</td>
                    <td className="px-4 py-3"><button type="button" onClick={() => setSelectedProject(project)} data-help-id="measurement-open-file" className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600 hover:underline">Open File</button><Help id="measurement-open-file" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const BottlenecksView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allAlerts.map((alertGroup) => (
          <div key={alertGroup.type} className="rounded-lg border border-red-200 bg-white p-5 shadow-sm" data-help-id="bottleneck-alert-card">
            <div className="mb-4 flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              <h3 className="text-lg font-bold">{alertGroup.type}<Help id="bottleneck-alert-card" /></h3>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-red-50 p-2"><div className="text-2xl font-bold text-red-700">{alertGroup.count}</div><div className="text-xs uppercase text-red-600">Items</div></div>
              <div className="rounded bg-orange-50 p-2" data-help-id="bottleneck-days-stuck"><div className="text-2xl font-bold text-orange-700">{alertGroup.oldest}<Help id="bottleneck-days-stuck" /></div><div className="text-xs uppercase text-orange-600">Oldest</div></div>
              <div className="rounded bg-yellow-50 p-2"><div className="text-2xl font-bold text-yellow-700">{alertGroup.avgDays}</div><div className="text-xs uppercase text-yellow-600">Avg Days</div></div>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-2">
              {alertGroup.items.map((item) => (
                <button
                  key={`${alertGroup.type}-${item.project.id}-${item.scope?.id || 'project'}`}
                  type="button"
                  onClick={() => setSelectedProject(item.project)}
                  data-help-id="bottleneck-open-file"
                  className="flex w-full cursor-pointer justify-between gap-3 rounded border border-slate-100 bg-slate-50 p-2 text-left text-sm hover:bg-slate-100"
                >
                  <span className="font-medium text-slate-800">{item.project.customer}{item.scope ? ` (${item.scope.type})` : ''}</span>
                  <span className="font-bold text-red-500">{item.daysStuck}d</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {allAlerts.length === 0 && (
          <div className="col-span-full rounded-lg border border-green-200 bg-green-50 py-12 text-center text-green-700">
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold">All Clear</h3>
            <p>There are currently no bottlenecks or stuck project scopes.</p>
          </div>
        )}
      </div>
    </div>
  );

  const SalesView = () => {
    const totalRevenue = salesStats.reduce((sum, rep) => sum + rep.revenue, 0);
    const totalLeads = salesStats.reduce((sum, rep) => sum + rep.leads, 0);
    const totalProjects = salesStats.reduce((sum, rep) => sum + rep.projects, 0);
    const totalCancelled = salesStats.reduce((sum, rep) => sum + rep.cancelled, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5" data-help-id="sales-summary-metrics">
          <MetricCard label="Sales Revenue" value={currency(totalRevenue)} detail={`${periodFilter} sold projects`} helpId="sales-revenue" helpIcon={<Help id="sales-revenue" />} />
          <MetricCard label="Projects Sold" value={totalProjects} detail="Filtered by region/period" helpId="sales-projects-sold" helpIcon={<Help id="sales-projects-sold" />} />
          <MetricCard label="Leads Given" value={totalLeads} detail="Demo lead input" helpId="sales-leads-given" helpIcon={<Help id="sales-leads-given" />} />
          <MetricCard label="Close Rate" value={totalLeads ? `${Math.round((totalProjects / totalLeads) * 100)}%` : '-'} detail="Projects divided by leads" helpId="sales-close-rate" helpIcon={<Help id="sales-close-rate" />} />
          <MetricCard label="Cancel Rate" value={totalProjects + totalCancelled ? `${Math.round((totalCancelled / (totalProjects + totalCancelled)) * 100)}%` : '-'} detail={`${totalCancelled} cancelled`} tone={totalCancelled ? 'bg-red-50' : 'bg-white'} helpId="sales-cancel-rate" helpIcon={<Help id="sales-cancel-rate" />} />
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" data-help-id="salesperson-performance-table">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h3 className="font-bold text-slate-800">Salesperson Performance<Help id="salesperson-performance-table" /></h3>
            <p className="mt-1 text-sm text-slate-500">Tracks revised project revenue, average contract, close rate, value per lead, and cancellations.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Salesperson', 'Projects', 'Cancelled', 'Scopes', 'Revenue', 'Deposits', 'Avg Contract', 'Leads', 'Close Rate', 'Value / Lead', 'Cancel Rate'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {salesStats.map((rep) => (
                  <tr key={rep.name} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">{rep.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{rep.projects}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{rep.cancelled}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{rep.scopes}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">{currency(rep.revenue)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{currency(rep.deposits)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{currency(rep.avgTicket)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{rep.leads}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{Math.round(rep.closingRate * 100)}%</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700" data-help-id="sales-value-per-lead">{currency(rep.valuePerLead)}<Help id="sales-value-per-lead" /></td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{Math.round(rep.cancellationRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const CriticalPathMeetingView = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-sm shadow-sm" data-help-id="meeting-view-header">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 p-4 text-white">
        <h2 className="flex items-center text-lg font-bold"><Presentation className="mr-2" /> Weekly Critical Path Review<Help id="meeting-view-header" /></h2>
        <span className="text-xs font-medium opacity-75">Focus: active uncompleted projects</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b-2 border-slate-200 bg-slate-100 text-xs font-black uppercase text-slate-600">
            <tr><th className="w-48 px-4 py-3" data-help-id="meeting-project-scopes">Project / Scopes</th><th className="w-32 px-4 py-3">Value</th><th className="px-4 py-3" data-help-id="meeting-current-status">Current Status / Next Action<Help id="meeting-current-status" /></th><th className="px-4 py-3" data-help-id="meeting-decision-needed">Decision Needed / Notes<Help id="meeting-decision-needed" /></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredProjects.filter((project) => !project.cancelled && !project.scopes.every((scope) => scope.completionDate)).map((project) => (
              <tr key={project.id} className="align-top hover:bg-slate-50">
                <td className="px-4 py-4">
                  <div className="text-base font-black text-slate-900">{project.customer}</div>
                  <div className="mt-1 text-xs text-slate-500">{daysBetween(todayISO(), project.dateSold)} days active</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {project.scopes.map((scope) => <span key={scope.id} className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{scope.type}</span>)}
                  </div>
                </td>
                <td className="px-4 py-4 font-bold text-slate-700">{currency(getRevisedAmount(project))}</td>
                <td className="space-y-3 px-4 py-4">
                  {project.scopes.map((scope) => {
                    const status = getScopeStatus(scope);
                    return (
                      <div key={scope.id} className="rounded border border-slate-200 bg-white p-2 shadow-sm">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-bold">{scope.type}:</span>
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                        <div className="flex items-center text-xs font-bold text-blue-700" data-help-id="meeting-next-action"><ChevronRight size={12} /> {calculateNextAction(scope, project)}<Help id="meeting-next-action" /></div>
                      </div>
                    );
                  })}
                </td>
                <td className="px-4 py-4">
                  <div className="min-h-[60px] rounded border border-amber-200 bg-amber-50 p-3 font-medium text-amber-900">
                    {project.decisionNeeded || <span className="italic text-amber-700/50">No specific decision requested.</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const CriticalPathBookView = () => (
    <div className="space-y-4 printable-book">
      <div className="hidden print:block">
        <h1 className="text-2xl font-black">Major League Builders Critical Path Book</h1>
        <p className="mt-1 text-sm">Printed {new Date().toLocaleDateString('en-US')} | Region: {regionFilter} | Period: {periodFilter}</p>
        <div className="mt-3">
          <WhiteboardStatusKey />
        </div>
      </div>
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center" data-help-id="book-view-header">
        <div>
          <h2 className="flex items-center text-xl font-black text-slate-900"><BookOpen size={22} className="mr-2 text-blue-600" /> Critical Path Book<Help id="book-view-header" /></h2>
          <p className="text-sm text-slate-500">Book-style one-row-per-scope replacement for the manual production ledger.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <WhiteboardStatusKey helpId="book-status-key" />
          <Help id="book-status-key" />
          <button type="button" onClick={exportCriticalPathCsv} data-help-id="book-export-csv" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><Download size={16} className="mr-2 inline" /> Export CSV</button><Help id="book-export-csv" />
          <button type="button" onClick={() => window.print()} data-help-id="book-print-book" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"><Printer size={16} className="mr-2 inline" /> Print Book</button><Help id="book-print-book" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-left text-xs">
            <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-wide text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 print:hidden">Action</th>
                {['Date Sold', 'Customer', 'City', 'Scope', 'Salesperson', 'Amount', 'Measure Req.', 'Measure Date', 'Order Date', 'Material ETA', 'Materials IN', 'Scheduled', 'Crew/Sub', 'Completion', 'Collected', 'Notes'].map((heading) => (
                  <th key={heading} className="border-b border-slate-200 px-3 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookRows.map(({ project, scope, id }) => {
                const alerts = scope ? getScopeAlerts(project, scope) : getProjectAlerts(project);
                return (
                  <tr key={id} className={`${alerts.length ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'} align-top transition-colors`}>
                    <td className="px-3 py-3 print:hidden">
                      <button
                        type="button"
                        onClick={() => setSelectedProject(project)}
                        data-help-id="book-open-file"
                        className="whitespace-nowrap rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Open File
                      </button>
                      <Help id="book-open-file" />
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-700" data-help-id="book-date-columns">{formatDate(project.dateSold)}</td>
                    <td className="px-3 py-3 font-black text-slate-900">{project.customer}{project.cancelled && <div className="mt-1 text-[10px] font-black uppercase text-red-600">Cancelled {formatDate(project.cancellationDate)}</div>}</td>
                    <td className="px-3 py-3">{project.city}</td>
                    <td className="px-3 py-3 font-bold">{scope?.type || 'No scope'}</td>
                    <td className="px-3 py-3">{project.salesperson || '-'}</td>
                    <td className="px-3 py-3 font-bold">{currency(getRevisedAmount(project))}</td>
                    <td className="px-3 py-3">{formatDate(scope?.measureRequested)}</td>
                    <td className="px-3 py-3">{formatDate(scope?.measureCompleted)}</td>
                    <td className="px-3 py-3">{formatDate(scope?.dateOrdered)}</td>
                    <td className="px-3 py-3">{formatDate(scope?.materialETA)}</td>
                    <td className="px-3 py-3">{formatDate(scope?.materialsIn)}</td>
                    <td className="px-3 py-3">{formatDate(scope?.scheduledInstallDate)}</td>
                    <td className="px-3 py-3">{scope?.crew || '-'}</td>
                    <td className="px-3 py-3">{formatDate(scope?.completionDate)}</td>
                    <td className="px-3 py-3">{project.collected ? 'Yes' : 'No'}</td>
                    <td className="max-w-[260px] px-3 py-3" data-help-id="book-alert-notes">
                      <div className="font-medium text-slate-700">{scope?.notes || project.notes || '-'}</div>
                      {alerts.length > 0 && <div className="mt-1 text-[10px] font-black uppercase text-red-600">{alerts.map((alert) => alert.type).join(', ')}</div>}
                      {scope && Object.keys(scope.specs || {}).length > 0 && <div className="mt-1 text-[10px] text-slate-500">{Object.entries(scope.specs).map(([key, value]) => `${key}: ${value}`).join(' | ')}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const WallboardKpi = ({ label, value, detail, tone = 'border-slate-700 bg-slate-900', helpId }) => (
    <div className={`rounded-lg border p-4 shadow-lg ${tone}`} data-help-id={helpId}>
      <p className="text-sm font-black uppercase tracking-wide text-slate-300">{label}</p>
      <div className="mt-2 text-4xl font-black text-white">{value}{helpId && <Help id={helpId} />}</div>
      {detail && <p className="mt-1 text-sm font-bold text-slate-300">{detail}</p>}
    </div>
  );

  const ScopeWallboardCard = ({ item }) => {
    const { project, scope, alerts, daysActive, daysStuck } = item;
    const status = getScopeStatus(scope);
    const urgent = alerts.length > 0;
    const dateLabel = scope.scheduledInstallDate
      ? `Install ${formatDate(scope.scheduledInstallDate)}`
      : scope.materialETA
        ? `ETA ${formatDate(scope.materialETA)}`
        : scope.materialsIn
          ? `Materials in ${formatDate(scope.materialsIn)}`
          : scope.measureRequested
            ? `Measure req. ${formatDate(scope.measureRequested)}`
            : `Sold ${formatDate(project.dateSold)}`;

    return (
      <div className={`rounded-lg border p-3 shadow ${urgent ? 'border-red-500 bg-red-950/70' : 'border-slate-700 bg-slate-900'}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h5 className="text-lg font-black leading-tight text-white">{project.customer}</h5>
            <p className="text-sm font-bold text-slate-300">{scope.type} | {project.city || project.region}</p>
          </div>
          {urgent && <span className="rounded bg-red-500 px-2 py-1 text-[10px] font-black uppercase text-white">{alerts[0].type}</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
          <span>Rep: {project.salesperson || 'TBD'}</span>
          <span className="text-right">{currency(getRevisedAmount(project))}</span>
          <span>{daysActive} days active</span>
          <span className="text-right">{dateLabel}</span>
        </div>
        <div className="mt-3 rounded bg-slate-950/70 p-2">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Next Action</p>
          <p className="text-sm font-black text-blue-200">{calculateNextAction(scope, project)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Badge className={status.color}>{status.label}</Badge>
          {urgent && <span className="text-xs font-black text-red-200">{daysStuck}d stuck</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {getWhiteboardDateBadges(scope).slice(0, 3).map((badge) => <span key={badge.label} className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}>{badge.label}: {formatDate(badge.value)}</span>)}
        </div>
      </div>
    );
  };

  const TVWallboardView = () => {
    const maxCardsPerColumn = wallboardDisplayMode ? 5 : 4;
    const columns = wallboardMode === 'trade' ? tradeBoardColumns : wallboardColumns;
    const columnNames = wallboardMode === 'trade' ? TRADE_BOARD_COLUMNS : WALLBOARD_COLUMNS;
    const lastUpdatedLabel = lastUpdated.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <div className={`${wallboardDisplayMode ? 'fixed inset-0 z-[60] overflow-y-auto bg-slate-950 p-5 text-white' : 'space-y-6'}`}>
        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-2xl">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-800 bg-slate-900 px-5 py-4 xl:flex-row xl:items-center" data-help-id="wallboard-header">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Monitor className="text-blue-400" size={30} />
                <h2 className="text-3xl font-black tracking-tight">Major League Builders TV Wallboard<Help id="wallboard-header" /></h2>
                <span className="rounded bg-blue-500/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-200">{regionFilter} | {periodFilter}</span>
              </div>
              <p className="mt-1 text-base font-semibold text-slate-300">Last updated {lastUpdatedLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setWallboardMode('production')} data-help-id="wallboard-production-flow-toggle" className={`rounded-lg px-4 py-3 text-sm font-black uppercase tracking-wide ${wallboardMode === 'production' ? 'bg-blue-600 text-white' : 'border border-slate-600 bg-slate-800 text-slate-200'}`}>Production Flow</button><Help id="wallboard-production-flow-toggle" />
              <button type="button" onClick={() => setWallboardMode('trade')} data-help-id="wallboard-trade-board-toggle" className={`rounded-lg px-4 py-3 text-sm font-black uppercase tracking-wide ${wallboardMode === 'trade' ? 'bg-blue-600 text-white' : 'border border-slate-600 bg-slate-800 text-slate-200'}`}>Trade Board</button><Help id="wallboard-trade-board-toggle" />
              <button type="button" onClick={toggleWallboardDisplayMode} data-help-id="wallboard-display-mode" className="flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-slate-700">
                {wallboardDisplayMode ? <Minimize2 size={18} className="mr-2" /> : <Maximize2 size={18} className="mr-2" />}
                {wallboardDisplayMode ? 'Exit Display Mode' : 'Display Mode'}
              </button><Help id="wallboard-display-mode" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3 2xl:grid-cols-6">
            <WallboardKpi label="Active Pipeline" value={currency(pipelineMetrics.totalRevenue)} detail="Open production value" tone="border-blue-700 bg-blue-950" helpId="wallboard-kpi-active-pipeline" />
            <WallboardKpi label="Active Projects" value={pipelineMetrics.activeProjects.length} detail={`${flatScopes.length} total scopes`} />
            <WallboardKpi label="Open Alerts" value={pipelineMetrics.alertCount} detail="Bottlenecks requiring action" tone={pipelineMetrics.alertCount ? 'border-red-700 bg-red-950' : 'border-green-700 bg-green-950'} helpId="wallboard-kpi-open-alerts" />
            <WallboardKpi label="Avg Sold to Done" value={`${pipelineMetrics.avgSoldToDone || '-'}d`} detail="Completed scopes" />
            <WallboardKpi label="Scheduled Scopes" value={pipelineMetrics.scheduledCount} detail="Install dates set" tone="border-pink-700 bg-pink-950" />
            <WallboardKpi label="Collection Needed" value={pipelineMetrics.collectionOpen} detail="Completed, not funded" tone={pipelineMetrics.collectionOpen ? 'border-amber-600 bg-amber-950' : 'border-slate-700 bg-slate-900'} helpId="wallboard-kpi-collection-needed" />
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl" data-help-id="wallboard-status-columns">
          <div className="mb-4 flex flex-col justify-between gap-2 lg:flex-row lg:items-end">
            <div>
              <h3 className="text-2xl font-black text-white">{wallboardMode === 'trade' ? 'Trade Board' : 'Production Flow'}</h3>
              <p className="text-sm font-semibold text-slate-400">{wallboardMode === 'trade' ? 'Mirrors the physical whiteboard by work category.' : 'Scope-level whiteboard ordered by alert urgency and days active.'}</p>
            </div>
            <WhiteboardStatusKey dark />
            <Help id="wallboard-status-columns" />
          </div>

          <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${columnNames.length > 7 ? 'xl:grid-cols-5 2xl:grid-cols-9' : 'xl:grid-cols-4 2xl:grid-cols-7'}`}>
            {columnNames.map((column) => {
              const items = columns[column] || [];
              return (
                <div key={column} className="min-h-[260px] rounded-lg border border-slate-700 bg-slate-950/80">
                  <div className="flex items-center justify-between border-b border-slate-700 px-3 py-3">
                    <h4 className="text-sm font-black uppercase tracking-wide text-slate-100">{column}</h4>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-black text-slate-200">{items.length}</span>
                  </div>
                  <div className="space-y-3 p-3">
                    {items.slice(0, maxCardsPerColumn).map((item) => <ScopeWallboardCard key={`${item.project.id}-${item.scope.id}`} item={item} />)}
                    {items.length === 0 && <div className="rounded border border-dashed border-slate-700 py-8 text-center text-sm font-bold text-slate-500">No scopes</div>}
                    {items.length > maxCardsPerColumn && <div className="rounded bg-slate-800 px-3 py-2 text-center text-sm font-black text-slate-200">+{items.length - maxCardsPerColumn} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="rounded-lg border border-red-900/70 bg-slate-900 p-4 shadow-xl" data-help-id="wallboard-bottleneck-spotlight">
            <h3 className="mb-4 text-2xl font-black text-white">Bottleneck Spotlight<Help id="wallboard-bottleneck-spotlight" /></h3>
            <div className="space-y-3">
              {allAlerts.slice(0, 5).map((group) => (
                <div key={group.type} className="rounded-lg border border-red-800 bg-red-950/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-black text-red-100">{group.type}</h4>
                      <p className="text-sm font-bold text-red-200">{group.count} affected | oldest {group.oldest}d</p>
                    </div>
                    <AlertTriangle className="text-red-300" size={28} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.items.slice(0, 3).map((item) => (
                      <span key={`${group.type}-${item.project.id}-${item.scope?.id || 'project'}`} className="rounded bg-white/10 px-2 py-1 text-xs font-bold text-red-100">
                        {item.project.customer}{item.scope ? ` / ${item.scope.type}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {allAlerts.length === 0 && <div className="rounded-lg border border-green-700 bg-green-950 p-5 text-lg font-black text-green-100">No active bottlenecks.</div>}
            </div>
          </section>

          <section className="rounded-lg border border-blue-900/70 bg-slate-900 p-4 shadow-xl" data-help-id="wallboard-sales-snapshot">
            <h3 className="mb-4 text-2xl font-black text-white">Sales Snapshot<Help id="wallboard-sales-snapshot" /></h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-950 p-4"><p className="text-xs font-black uppercase text-blue-300">Revenue</p><p className="text-3xl font-black text-white">{currency(wallboardSalesTotals.totalRevenue)}</p></div>
              <div className="rounded-lg bg-slate-950 p-4"><p className="text-xs font-black uppercase text-slate-400">Projects Sold</p><p className="text-3xl font-black text-white">{wallboardSalesTotals.totalProjects}</p></div>
              <div className="rounded-lg bg-slate-950 p-4"><p className="text-xs font-black uppercase text-slate-400">Leads Given</p><p className="text-3xl font-black text-white">{wallboardSalesTotals.totalLeads}</p></div>
              <div className="rounded-lg bg-green-950 p-4"><p className="text-xs font-black uppercase text-green-300">Close Rate</p><p className="text-3xl font-black text-white">{wallboardSalesTotals.closeRate}%</p></div>
              <div className="rounded-lg bg-red-950 p-4"><p className="text-xs font-black uppercase text-red-300">Cancel Rate</p><p className="text-3xl font-black text-white">{wallboardSalesTotals.cancellationRate}%</p></div>
            </div>
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Top salesperson by revenue</p>
              {wallboardSalesTotals.topRep ? (
                <>
                  <p className="mt-1 text-3xl font-black text-white">{wallboardSalesTotals.topRep.name}</p>
                  <p className="text-lg font-bold text-blue-200">{currency(wallboardSalesTotals.topRep.revenue)} | {currency(wallboardSalesTotals.topRep.valuePerLead)} per lead</p>
                </>
              ) : (
                <p className="mt-2 text-lg font-bold text-slate-400">No sales data for filters.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-amber-900/70 bg-slate-900 p-4 shadow-xl" data-help-id="wallboard-critical-path-spotlight">
            <h3 className="mb-4 text-2xl font-black text-white">Critical Path Spotlight<Help id="wallboard-critical-path-spotlight" /></h3>
            <div className="space-y-3">
              {criticalPathSpotlight.map((item) => (
                <div key={item.id} className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-black text-amber-100">{item.project.customer}{item.scope ? ` / ${item.scope.type}` : ''}</h4>
                      <p className="text-sm font-bold text-amber-200">{item.label}</p>
                    </div>
                    <span className="rounded bg-amber-400 px-2 py-1 text-xs font-black text-amber-950">{daysBetween(todayISO(), item.project.dateSold)}d active</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-amber-50">{item.detail}</p>
                </div>
              ))}
              {criticalPathSpotlight.length === 0 && <div className="rounded-lg border border-green-700 bg-green-950 p-5 text-lg font-black text-green-100">No critical discussion items.</div>}
            </div>
          </section>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <header className={`${wallboardDisplayMode && currentView === VIEWS.WALLBOARD ? 'hidden' : 'sticky'} top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur`}>
        <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="text-blue-600" size={26} />
              <h1 className="text-2xl font-black tracking-tight text-slate-950">Major League Builders Operator View</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportBackup} className="hidden" />
            <label data-help-id="global-region-filter" className="text-sm font-semibold text-slate-600">
              Region
              <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
                {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
              <Help id="global-region-filter" />
            </label>
            <label data-help-id="global-period-filter" className="text-sm font-semibold text-slate-600">
              Period
              <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
                {PERIODS.map((period) => <option key={period} value={period}>{period}</option>)}
              </select>
              <Help id="global-period-filter" />
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setAdminMenuOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                aria-label="Open admin tools"
                data-help-id="global-admin-menu"
              >
                <User size={18} />
              </button>
              {adminMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-black text-slate-900">Admin Tools</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Local demo storage active</p>
                    <p className="mt-1 text-xs text-slate-500">Prototype data is not connected to JobNimbus or QuickBooks.</p>
                  </div>
                  <button data-help-id="admin-export-backup" type="button" onClick={() => { exportProjectsJson(projects); setAdminMenuOpen(false); }} className="flex w-full items-center px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <Download size={16} className="mr-2" /> Export Backup JSON
                  </button>
                  <button data-help-id="admin-import-backup" type="button" onClick={() => { fileInputRef.current?.click(); setAdminMenuOpen(false); }} className="flex w-full items-center px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <Upload size={16} className="mr-2" /> Import Backup JSON
                  </button>
                  <button data-help-id="admin-reset-demo-data" type="button" onClick={() => { setAdminMenuOpen(false); handleResetDemoData(); }} className="flex w-full items-center border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-red-700 hover:bg-red-50">
                    <Trash2 size={16} className="mr-2" /> Reset Demo Data
                  </button>
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-slate-500">Help</div>
                  <button data-help-id="admin-help-center" type="button" onClick={() => { setHelpCenterOpen(true); setAdminMenuOpen(false); }} className="flex w-full items-center px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                    Help Center
                  </button>
                  <button data-help-id="admin-help-icons-toggle" type="button" onClick={() => { setHelpIconsEnabled((enabled) => !enabled); setAdminMenuOpen(false); }} className="flex w-full items-center px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                    {helpIconsEnabled ? 'Turn Help Icons Off' : 'Turn Help Icons On'}
                  </button>
                  <button data-help-id="admin-start-walkthrough" type="button" onClick={() => startHelpTour('full-dashboard')} className="flex w-full items-center px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                    Start Guided Walkthrough
                  </button>
                </div>
              )}
            </div>
            <Help id="global-admin-menu" />
            <button data-help-id="global-new-project" type="button" onClick={() => setSelectedProject(emptyProject())} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800">
              <Plus size={16} className="mr-2 inline" /> New Project
            </button>
            <Help id="global-new-project" />
          </div>
        </div>

        <nav data-help-id="global-main-nav" className="mx-auto flex w-full max-w-[1920px] gap-2 overflow-x-auto px-4 pb-2" aria-label="Main navigation">
          {MAIN_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMainArea(item.id)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                mainArea === item.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
          <Help id={mainArea === MAIN_AREAS.BOTTLENECKS ? 'bottlenecks-main-nav' : mainArea === MAIN_AREAS.SALES ? 'sales-main-nav' : mainArea === MAIN_AREAS.WALLBOARD ? 'wallboard-main-nav' : 'production-main-nav'} />
        </nav>

        {(mainArea === MAIN_AREAS.PRODUCTION || mainArea === MAIN_AREAS.BOTTLENECKS) && (
          <div data-help-id={mainArea === MAIN_AREAS.PRODUCTION ? 'production-subnav' : 'bottlenecks-subnav'} className="mx-auto flex w-full max-w-[1920px] gap-2 overflow-x-auto px-4 pb-3" aria-label={mainArea === MAIN_AREAS.PRODUCTION ? 'Production views' : 'Bottleneck filters'}>
            {mainArea === MAIN_AREAS.PRODUCTION && PRODUCTION_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setProductionMode(item.id)}
                data-help-id={item.id === PRODUCTION_MODES.BOOK ? 'production-book-mode' : item.id === PRODUCTION_MODES.MEETING ? 'production-meeting-mode' : 'production-customer-mode'}
                className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors ${
                  productionMode === item.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
            {mainArea === MAIN_AREAS.PRODUCTION && <Help id={productionMode === PRODUCTION_MODES.BOOK ? 'production-book-mode' : productionMode === PRODUCTION_MODES.MEETING ? 'production-meeting-mode' : 'production-customer-mode'} />}
            {mainArea === MAIN_AREAS.BOTTLENECKS && BOTTLENECK_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setBottleneckMode(item.id)}
                data-help-id={item.id === BOTTLENECK_MODES.MEASUREMENT ? 'bottlenecks-measurement-filter' : 'bottlenecks-all-filter'}
                className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors ${
                  bottleneckMode === item.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
            {mainArea === MAIN_AREAS.BOTTLENECKS && <Help id={bottleneckMode === BOTTLENECK_MODES.MEASUREMENT ? 'bottlenecks-measurement-filter' : 'bottlenecks-all-filter'} />}
          </div>
        )}
      </header>

      <main className={`${currentView === VIEWS.WALLBOARD ? 'mx-auto max-w-[1920px] px-3 py-3' : 'mx-auto w-full max-w-[1920px] space-y-6 px-4 py-6'}`}>
        {currentView !== VIEWS.CRITICAL && currentView !== VIEWS.WALLBOARD && currentView !== VIEWS.BOOK && <ExecutiveSummary />}
        {currentView === VIEWS.CENTER && <ProjectCenterView />}
        {currentView === VIEWS.MEASURE && <MeasurementQueueView />}
        {currentView === VIEWS.BOTTLENECKS && <BottlenecksView />}
        {currentView === VIEWS.SALES && <SalesView />}
        {currentView === VIEWS.CRITICAL && <CriticalPathMeetingView />}
        {currentView === VIEWS.BOOK && <CriticalPathBookView />}
        {currentView === VIEWS.WALLBOARD && <TVWallboardView />}
      </main>

      {selectedProject && (
        <ProjectModal
          project={selectedProject.customer || selectedProject.id ? selectedProject : null}
          onClose={() => setSelectedProject(null)}
          onSave={saveProject}
          helpIconsEnabled={showHelpIcons}
          onOpenHelpTopic={openHelpTopic}
        />
      )}

      <HelpCenterDrawer
        open={helpCenterOpen}
        onClose={() => setHelpCenterOpen(false)}
        area={mainArea}
        mode={currentHelpMode}
        activeTopicId={activeHelpTopicId}
        onSelectTopic={setActiveHelpTopicId}
        helpIconsEnabled={helpIconsEnabled}
        onToggleHelpIcons={() => setHelpIconsEnabled((enabled) => !enabled)}
        onStartTour={startHelpTour}
      />

      <GuidedWalkthrough
        activeTour={activeTour}
        onClose={() => setActiveTour(null)}
        onComplete={completeHelpTour}
        onNavigateToItem={navigateToHelpItem}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 0.35in; }
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .printable-book, .printable-book * { visibility: visible; }
          .printable-book { position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
          .printable-book button, .printable-book .print\\:hidden { display: none !important; }
          .printable-book table { border-collapse: collapse; font-size: 9px; }
          .printable-book tr { break-inside: avoid; page-break-inside: avoid; }
          .printable-book th, .printable-book td { border: 1px solid #cbd5e1; padding: 4px; }
          .printable-book thead { display: table-header-group; }
        }
      ` }} />
    </div>
  );
}
