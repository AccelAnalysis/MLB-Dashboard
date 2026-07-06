import React, { useEffect, useRef, useState } from 'react';

const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches;

const HelpIcon = ({ item, enabled, onOpenTopic }) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!enabled || !item) return null;

  const handleOpen = (event) => {
    event.stopPropagation();
    if (isMobileViewport()) {
      onOpenTopic(item.id);
      return;
    }
    setOpen((current) => !current);
  };

  return (
    <span ref={popoverRef} className="relative inline-flex align-middle print:hidden">
      <button
        type="button"
        onClick={handleOpen}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-[11px] font-black text-blue-700 shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-label={`Help: ${item.title}`}
      >
        ?
      </button>
      {open && (
        <span className="absolute right-0 top-7 z-50 block w-80 rounded-lg border border-slate-200 bg-white p-4 text-left text-sm text-slate-700 shadow-xl">
          <span className="block text-base font-black text-slate-950">{item.title}</span>
          <span className="mt-1 block font-semibold text-slate-600">{item.summary}</span>
          <span className="mt-3 block leading-relaxed">{item.body}</span>
          {item.manualEquivalent && (
            <span className="mt-3 block rounded bg-slate-50 p-2 text-xs font-semibold text-slate-600">
              Manual equivalent: {item.manualEquivalent}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenTopic(item.id);
            }}
            className="mt-3 rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            Open in Help Center
          </button>
        </span>
      )}
    </span>
  );
};

export default HelpIcon;
