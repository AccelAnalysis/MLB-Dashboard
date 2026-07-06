import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { fieldGuideItems, getHelpItemsForScreen, helpById, manualProcessMap } from './helpContent';

const screenLabel = (area, mode) => {
  if (area === 'production') {
    if (mode === 'book') return 'Production > Book';
    if (mode === 'meeting') return 'Production > Meeting';
    return 'Production > Customer';
  }
  if (area === 'bottlenecks') {
    return mode === 'measurement' ? 'Bottlenecks > Measurement' : 'Bottlenecks > All';
  }
  if (area === 'sales') return 'Sales';
  if (area === 'wallboard') return 'TV Wallboard';
  return 'Current Screen';
};

const screenTour = (area) => {
  if (area === 'production') return 'production';
  if (area === 'bottlenecks') return 'bottlenecks';
  if (area === 'sales') return 'sales';
  if (area === 'wallboard') return 'tv-wallboard';
  return 'full-dashboard';
};

const HelpTopic = ({ item, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(item.id)}
    className={`w-full rounded-lg border p-3 text-left transition-colors ${
      selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <span className="block text-sm font-black text-slate-900">{item.title}</span>
    <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-600">{item.summary}</span>
  </button>
);

const HelpCenterDrawer = ({
  open,
  onClose,
  area,
  mode,
  activeTopicId,
  onSelectTopic,
  helpIconsEnabled,
  onToggleHelpIcons,
  onStartTour,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (open) setCollapsed(false);
  }, [open]);

  if (!open) return null;

  const currentItems = getHelpItemsForScreen(area, mode).filter((item) => item.area !== 'modal').slice(0, 12);
  const selectedItem = helpById[activeTopicId] || currentItems[0] || helpById['global-main-nav'];

  if (collapsed) {
    return (
      <div className="fixed right-3 top-24 z-[95] print:hidden">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 shadow-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Expand Help Center"
          title="Expand Help Center"
        >
          <Menu size={18} />
          Help
        </button>
      </div>
    );
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-[95] flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl print:hidden" aria-label="Help Center">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Help Center</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Learn how this dashboard replaces the Critical Path Book and whiteboard.</p>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => setCollapsed(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Collapse Help Center" title="Collapse Help Center">
              <Menu size={20} />
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close Help Center">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onStartTour('full-dashboard')} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
            Start Guided Walkthrough
          </button>
          <button type="button" onClick={() => onStartTour(screenTour(area))} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
            This Screen Tour
          </button>
          <button type="button" onClick={onToggleHelpIcons} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
            {helpIconsEnabled ? 'Hide help icons' : 'Show help icons'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">Current screen</p>
          <h3 className="mt-1 text-lg font-black text-blue-950">{screenLabel(area, mode)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-blue-900">{selectedItem?.body}</p>
          {selectedItem?.manualEquivalent && (
            <p className="mt-3 rounded bg-white/70 p-2 text-xs font-bold text-blue-900">Manual equivalent: {selectedItem.manualEquivalent}</p>
          )}
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Current Screen Help</h3>
          <div className="mt-3 grid gap-2">
            {currentItems.map((item) => (
              <HelpTopic key={item.id} item={item} selected={selectedItem?.id === item.id} onSelect={onSelectTopic} />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Selected Topic</h3>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="text-lg font-black text-slate-950">{selectedItem?.title}</h4>
            <p className="mt-1 text-sm font-semibold text-slate-600">{selectedItem?.summary}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{selectedItem?.body}</p>
            {selectedItem?.whyItMatters && <p className="mt-3 text-sm leading-relaxed text-slate-700"><span className="font-bold">Why it matters:</span> {selectedItem.whyItMatters}</p>}
            {selectedItem?.whatToDo && <p className="mt-2 text-sm leading-relaxed text-slate-700"><span className="font-bold">What to do here:</span> {selectedItem.whatToDo}</p>}
            {selectedItem?.manualEquivalent && <p className="mt-3 rounded bg-slate-50 p-2 text-xs font-bold text-slate-600">Manual equivalent: {selectedItem.manualEquivalent}</p>}
            {selectedItem?.area === 'modal' && (
              <button type="button" onClick={() => onStartTour('project-file')} className="mt-3 rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
                Start Project File Tour
              </button>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Manual Process Map</h3>
          <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {manualProcessMap.map((item) => (
              <div key={item.manual} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-700">{item.manual}</span>
                <span className="text-slate-400">to</span>
                <span className="font-bold text-slate-950">{item.digital}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Field Guide</h3>
          <div className="mt-3 grid gap-2">
            {fieldGuideItems.map((item) => (
              <HelpTopic key={item.id} item={item} selected={selectedItem?.id === item.id} onSelect={onSelectTopic} />
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
};

export default HelpCenterDrawer;
