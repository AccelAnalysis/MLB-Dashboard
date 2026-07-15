import { WHITEBOARD_STATUS_KEY } from '../../data/constants';

export default function WhiteboardStatusKey({ dark = false, helpId }) {
  return (
    <div data-help-id={helpId} className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide">
      {WHITEBOARD_STATUS_KEY.map((item) => (
        <span key={item.label} className={`rounded border px-2 py-1 ${item.className}`}>{item.label}</span>
      ))}
      <span className={`rounded border px-2 py-1 ${dark ? 'border-red-500 bg-red-500 text-white' : 'border-red-300 bg-red-100 text-red-800'}`}>Red urgent/stuck</span>
    </div>
  );
}
