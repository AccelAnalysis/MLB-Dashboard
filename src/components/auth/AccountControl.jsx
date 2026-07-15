import { useEffect, useRef, useState } from 'react';
import {
  Database,
  KeyRound,
  Loader2,
  LogOut,
  Save,
  Shield,
  UserCog,
} from 'lucide-react';
import { ROLE_LABELS } from '../../auth/permissions';
import { useAuth } from '../../auth/AuthContext';

export default function AccountControl({ onOpenUsers, onOpenBackend }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(auth.profile?.displayName || '');
  const [message, setMessage] = useState('');
  const containerRef = useRef(null);

  const displayMode = new URLSearchParams(window.location.search).get('display') === '1';
  const profile = auth.profile;
  const capabilities = profile?.capabilities || {};

  useEffect(() => setDisplayName(profile?.displayName || ''), [profile?.displayName]);

  useEffect(() => {
    const close = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!profile || auth.mode === 'local' || displayMode) return null;

  const saveProfile = async () => {
    setMessage('');
    try {
      await auth.changeDisplayName(displayName);
      setMessage('Profile updated.');
    } catch {
      // AuthContext exposes the error below.
    }
  };

  const sendRecovery = async () => {
    setMessage('');
    try {
      await auth.requestPasswordReset(profile.email);
      setMessage('Password-recovery email requested.');
    } catch {
      // AuthContext exposes the error below.
    }
  };

  return (
    <div ref={containerRef} className="fixed bottom-4 right-4 z-[70] print:hidden">
      {open && (
        <div className="mb-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Authenticated account</p>
            <p className="mt-1 text-lg font-black text-slate-950">{profile.displayName}</p>
            <p className="text-sm text-slate-600">{profile.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black uppercase text-slate-700">{ROLE_LABELS[profile.role] || profile.role}</span>
              {capabilities.readOnly && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-800">Read only</span>}
            </div>
          </div>

          <div className="space-y-3 p-4">
            {(auth.actionError || message) && (
              <div className={`rounded-lg border p-3 text-xs ${auth.actionError ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
                {auth.actionError?.message || message}
              </div>
            )}

            <label className="block text-xs font-black uppercase tracking-wide text-slate-600">
              Display name
              <div className="mt-1 flex gap-2">
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium normal-case" />
                <button type="button" onClick={saveProfile} disabled={auth.working || displayName.trim().length < 2} className="rounded-lg border border-slate-300 bg-white px-3 text-slate-700 hover:bg-slate-50 disabled:opacity-50" aria-label="Save profile name">
                  {auth.working ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                </button>
              </div>
            </label>

            {capabilities.manageUsers && (
              <button type="button" onClick={() => { setOpen(false); onOpenUsers(); }} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                <UserCog className="mr-3 text-blue-700" size={18} /> Users, roles, and access
              </button>
            )}

            {capabilities.backendAdministration && (
              <button type="button" onClick={() => { setOpen(false); onOpenBackend(); }} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Database className="mr-3 text-blue-700" size={18} /> Backend administration
              </button>
            )}

            <button type="button" onClick={sendRecovery} disabled={auth.working} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <KeyRound className="mr-3" size={18} /> Send password-recovery email
            </button>

            <button type="button" onClick={() => auth.logout().catch(() => {})} disabled={auth.working} className="flex w-full items-center rounded-lg border-t border-slate-200 px-3 py-3 text-left text-sm font-black text-red-700 hover:bg-red-50 disabled:opacity-50">
              <LogOut className="mr-3" size={18} /> Sign out
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          auth.clearActionError();
          setMessage('');
          setOpen((current) => !current);
        }}
        className="flex items-center rounded-full border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl hover:bg-slate-800"
        aria-label="Open account controls"
      >
        <Shield className="mr-2 text-blue-300" size={18} />
        {profile.displayName.split(' ')[0] || 'Account'}
      </button>
    </div>
  );
}
