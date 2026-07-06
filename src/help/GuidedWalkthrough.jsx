import React, { useEffect, useMemo, useState } from 'react';
import { getTourItems } from './helpContent';

const emptyRect = { top: 96, left: 16, width: 0, height: 0 };

const getElementRect = (target) => {
  if (!target) return emptyRect;
  const element = document.querySelector(target);
  if (!element) return emptyRect;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

const tooltipPosition = (rect) => {
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const top = spaceBelow > 260 ? rect.top + rect.height + 16 : Math.max(16, rect.top - 260);
  const left = Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - 380));
  return { top, left };
};

const GuidedWalkthrough = ({ activeTour, onClose, onComplete, onNavigateToItem }) => {
  const steps = useMemo(() => getTourItems(activeTour), [activeTour]);
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(emptyRect);
  const step = steps[index];

  useEffect(() => {
    if (!step) return undefined;
    onNavigateToItem(step);
    let measureTimer;
    const timer = window.setTimeout(() => {
      const element = document.querySelector(step.target);
      element?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      measureTimer = window.setTimeout(() => setTargetRect(getElementRect(step.target)), 260);
    }, 160);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(measureTimer);
    };
  }, [step, onNavigateToItem]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleResize = () => {
      if (step) setTargetRect(getElementRect(step.target));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [step]);

  if (!activeTour || !step) return null;

  const highlight = {
    top: Math.max(8, targetRect.top - 8),
    left: Math.max(8, targetRect.left - 8),
    width: Math.max(120, targetRect.width + 16),
    height: Math.max(48, targetRect.height + 16),
  };
  const position = tooltipPosition(highlight);
  const isLast = index === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete(activeTour);
      return;
    }
    setIndex((current) => current + 1);
  };

  return (
    <div className="fixed inset-0 z-[90] print:hidden" role="dialog" aria-modal="true" aria-label="Guided walkthrough">
      <div className="absolute inset-0 bg-slate-950/70" />
      <div
        className="pointer-events-none absolute rounded-xl border-2 border-blue-300 bg-white/10 shadow-[0_0_0_9999px_rgba(2,6,23,0.68)] transition-all"
        style={{
          top: `${highlight.top}px`,
          left: `${highlight.left}px`,
          width: `${highlight.width}px`,
          height: `${highlight.height}px`,
        }}
      />
      <div
        className="absolute w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">Step {index + 1} of {steps.length}</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{step.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100">Skip</button>
        </div>
        <p className="mt-3 text-sm leading-relaxed">{step.body}</p>
        {step.manualEquivalent && <p className="mt-3 rounded bg-slate-50 p-2 text-xs font-bold text-slate-600">Manual equivalent: {step.manualEquivalent}</p>}
        {step.whyItMatters && <p className="mt-3 text-sm leading-relaxed"><span className="font-bold">Why it matters:</span> {step.whyItMatters}</p>}
        {step.whatToDo && <p className="mt-2 text-sm leading-relaxed"><span className="font-bold">What to do here:</span> {step.whatToDo}</p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Skip</button>
            <button type="button" onClick={handleNext} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedWalkthrough;
