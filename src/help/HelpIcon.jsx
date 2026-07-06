import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches;

const HelpIcon = ({ item, enabled, onOpenTopic }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(320, window.innerWidth - 32);
    const preferredLeft = rect.right - width;
    const left = Math.min(Math.max(16, preferredLeft), window.innerWidth - width - 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 260 ? rect.bottom + 8 : Math.max(16, rect.top - 260);
    setPosition({ top, left });
  };

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    updatePosition();
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  if (!enabled || !item) return null;

  const handleOpen = (event) => {
    event.stopPropagation();
    if (isMobileViewport()) {
      onOpenTopic(item.id);
      return;
    }
    updatePosition();
    setOpen((current) => !current);
  };

  return (
    <span className="inline-flex align-middle print:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-[11px] font-black text-blue-700 shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-label={`Help: ${item.title}`}
      >
        ?
      </button>
      {open && createPortal(
        <span
          ref={popoverRef}
          className="fixed z-[120] block w-[calc(100vw-2rem)] max-w-80 rounded-lg border border-slate-200 bg-white p-4 text-left text-sm text-slate-700 shadow-2xl"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
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
        </span>,
        document.body,
      )}
    </span>
  );
};

export default HelpIcon;
