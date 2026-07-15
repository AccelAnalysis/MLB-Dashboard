import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  MailPlus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  UserCog,
  X,
} from 'lucide-react';
import { ROLE_LABELS, ROLE_OPTIONS } from '../../auth/permissions';
import { USER_STATUS } from '../../domain/enums';
import {
  getUserAdministrationSnapshot,
  inviteDashboardUser,
  sendDashboardUserPasswordReset,
  updateDashboardUser,
} from '../../services/userAdministrationService';

const REGIONS = ['Virginia', 'Carolina'];

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const Notice = ({ children, tone = 'blue' }) => {
  const styles = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-green-200 bg-green-50 text-green-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  return <div className={`rounded-xl border p-4 text-sm ${styles[tone] || styles.blue}`}>{children}</div>;
};

const RegionCheckboxes = ({ value, onChange, disabled = false }) => (
  <div className="flex flex-wrap gap-3">
    {REGIONS.map((region) => (
      <label key={region} className="flex items-center gap-2 text-xs font-bold text-slate-700">
        <input
          type="checkbox"
          checked={value.includes(region)}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.checked
              ? [...new Set([...value, region])]
              : value.filter((item) => item !== region);
            onChange(next);
          }}
        />
        {region}
      </label>
    ))}
  </div>
);

const InviteUserForm = ({ snapshot, onInvited }) => {
  const currentRole = snapshot?.context?.profile?.role;
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    role: 'viewer',
    teamMemberId: '',
    regionAccess: ['Virginia'],
  });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  const roleOptions = useMemo(() => ROLE_OPTIONS.filter((option) => (
    option.value !== 'owner' || currentRole === 'owner'
  )), [currentRole]);

  const submit = async (event) => {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      await inviteDashboardUser(form);
      setForm({ displayName: '', email: '', role: 'viewer', teamMemberId: '', regionAccess: ['Virginia'] });
      await onInvited('Invitation sent and the linked dashboard profile was created.');
    } catch (nextError) {
      setError(nextError);
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center gap-3">
        <MailPlus className="text-blue-700" size={22} />
        <div>
          <h3 className="text-lg font-black text-slate-950">Invite a dashboard user</h3>
          <p className="text-sm text-slate-600">Public registration is disabled. Invitations create both the authentication account and the application profile.</p>
        </div>
      </div>

      {error && <div className="mb-4"><Notice tone="red">{error.message || String(error)}</Notice></div>}

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Display name
          <input required minLength={2} value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Email
          <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Role
          <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Linked team member
          <select value={form.teamMemberId} onChange={(event) => setForm((current) => ({ ...current, teamMemberId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="">No team-member link</option>
            {(snapshot?.teamMembers || []).map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
          </select>
        </label>
        <div className="lg:col-span-2">
          <p className="mb-2 text-sm font-bold text-slate-700">Region access</p>
          <RegionCheckboxes value={form.regionAccess} onChange={(regionAccess) => setForm((current) => ({ ...current, regionAccess }))} />
        </div>
        <div className="lg:col-span-2">
          <button type="submit" disabled={working} className="flex items-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">
            {working ? <Loader2 className="mr-2 animate-spin" size={18} /> : <Send className="mr-2" size={18} />}
            Send invitation
          </button>
        </div>
      </form>
    </section>
  );
};

const UserRow = ({ user, snapshot, onChanged }) => {
  const currentProfile = snapshot.context.profile;
  const currentRole = currentProfile.role;
  const [draft, setDraft] = useState({
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    teamMemberId: user.teamMemberId || '',
    regionAccess: user.regionAccess || [],
    disabledReason: user.disabledReason || '',
  });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  const roleOptions = ROLE_OPTIONS.filter((option) => option.value !== 'owner' || currentRole === 'owner');
  const ownerProtected = user.role === 'owner' && currentRole !== 'owner';
  const isCurrentUser = user.id === currentProfile.id;

  const save = async () => {
    setWorking(true);
    setError(null);
    try {
      await updateDashboardUser(user.id, draft);
      await onChanged(`${user.displayName} was updated.`);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setWorking(false);
    }
  };

  const sendReset = async () => {
    setWorking(true);
    setError(null);
    try {
      await sendDashboardUserPasswordReset(user.email);
      await onChanged(`A password-recovery email was requested for ${user.email}.`, false);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setWorking(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-slate-950">{user.displayName}</h3>
            {isCurrentUser && <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-800">You</span>}
            <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${user.status === 'active' ? 'bg-green-100 text-green-800' : user.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{user.status}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          <p className="mt-1 text-xs text-slate-500">Last login: {formatDateTime(user.lastLoginAt)} · Invited: {formatDateTime(user.invitedAt)}</p>
        </div>
        <button type="button" onClick={sendReset} disabled={working || !user.email} className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <Send className="mr-2" size={15} /> Send recovery
        </button>
      </div>

      {error && <div className="mt-4"><Notice tone="red">{error.message || String(error)}</Notice></div>}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-black uppercase tracking-wide text-slate-600">
          Display name
          <input value={draft.displayName} disabled={ownerProtected} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium normal-case disabled:bg-slate-100" />
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-slate-600">
          Role
          <select value={draft.role} disabled={ownerProtected} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case disabled:bg-slate-100">
            {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-slate-600">
          Status
          <select value={draft.status} disabled={ownerProtected} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case disabled:bg-slate-100">
            {Object.values(USER_STATUS).map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-slate-600">
          Team member
          <select value={draft.teamMemberId} disabled={ownerProtected} onChange={(event) => setDraft((current) => ({ ...current, teamMemberId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case disabled:bg-slate-100">
            <option value="">No team-member link</option>
            {snapshot.teamMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_auto] lg:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">Region access</p>
          <RegionCheckboxes value={draft.regionAccess} disabled={ownerProtected} onChange={(regionAccess) => setDraft((current) => ({ ...current, regionAccess }))} />
        </div>
        <label className="text-xs font-black uppercase tracking-wide text-slate-600">
          Inactive reason
          <input value={draft.disabledReason} disabled={ownerProtected || draft.status !== 'inactive'} onChange={(event) => setDraft((current) => ({ ...current, disabledReason: event.target.value }))} placeholder="Required operational explanation when deactivating" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium normal-case disabled:bg-slate-100" />
        </label>
        <button type="button" onClick={save} disabled={working || ownerProtected} className="flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
          {working ? <Loader2 className="mr-2 animate-spin" size={17} /> : <Save className="mr-2" size={17} />}
          Save user
        </button>
      </div>

      {ownerProtected && <p className="mt-3 text-xs font-bold text-amber-700">Only an owner can modify another owner profile.</p>}
    </article>
  );
};

export default function UserAdministrationPanel({ open, onClose }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await getUserAdministrationSnapshot());
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  const canManage = Boolean(snapshot?.context?.profile?.capabilities?.manageUsers);
  const notifyChanged = async (nextMessage, shouldRefresh = true) => {
    setMessage(nextMessage);
    if (shouldRefresh) await refresh();
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="User administration">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="flex gap-3">
            <UserCog className="mt-1 text-blue-700" size={28} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Phase 5 administration</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Users, roles, and access</h2>
              <p className="mt-1 text-sm text-slate-600">Invite-only authentication, application profiles, team links, regions, and account lifecycle.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={refresh} disabled={loading} className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-50">
              <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={17} /> Refresh
            </button>
            <button type="button" onClick={onClose} className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100">
              <X className="mr-2" size={17} /> Close
            </button>
          </div>
        </header>

        <div className="space-y-6 p-6">
          {loading && !snapshot && <div className="flex justify-center py-16 text-slate-600"><Loader2 className="mr-3 animate-spin" /> Loading users…</div>}
          {error && <Notice tone="red"><span className="flex gap-2"><AlertTriangle size={18} /> {error.message || String(error)}</span></Notice>}
          {message && <Notice tone="green">{message}</Notice>}

          {snapshot?.mode === 'local' && (
            <Notice tone="amber">User invitations and Supabase account management are disabled in local provider mode. Switch to a configured Supabase development environment to test Phase 5 authentication.</Notice>
          )}

          {snapshot && !canManage && snapshot.mode !== 'local' && (
            <Notice tone="red">Your profile does not have permission to administer users.</Notice>
          )}

          {snapshot && canManage && (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <ShieldCheck size={20} />
                <span><strong>{snapshot.context.profile.displayName}</strong> is managing users as {ROLE_LABELS[snapshot.context.profile.role] || snapshot.context.profile.role}.</span>
              </div>
              <InviteUserForm snapshot={snapshot} onInvited={notifyChanged} />
              <section>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">Dashboard profiles</h3>
                    <p className="text-sm text-slate-600">{snapshot.users.length} profiles returned by the secured administration view.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {snapshot.users.map((user) => <UserRow key={user.id} user={user} snapshot={snapshot} onChanged={notifyChanged} />)}
                  {!snapshot.users.length && <Notice tone="amber">No dashboard profiles were returned.</Notice>}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
