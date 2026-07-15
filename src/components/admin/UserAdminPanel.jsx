import { useCallback, useEffect, useMemo, useState } from 'react';
import { USER_STATUS } from '../../domain/enums';
import {
  getAssignableRoles,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from '../../auth/permissions';
import { sendPasswordReset } from '../../services/authService';
import {
  getUserAdministrationSnapshot,
  inviteUser,
  updateUserAccess,
} from '../../services/userAdminService';

const REGIONS = ['Virginia', 'Carolina'];

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US');
};

const statusTone = (status) => {
  if (status === USER_STATUS.ACTIVE) return 'border-green-200 bg-green-50 text-green-800';
  if (status === USER_STATUS.INACTIVE) return 'border-red-200 bg-red-50 text-red-800';
  return 'border-amber-200 bg-amber-50 text-amber-900';
};

const RegionSelector = ({ value, onChange, disabled = false }) => (
  <div className="flex flex-wrap gap-3">
    {REGIONS.map((region) => (
      <label key={region} className="flex items-center gap-2 text-xs font-bold text-slate-700">
        <input
          type="checkbox"
          checked={(value || []).includes(region)}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.checked
              ? [...new Set([...(value || []), region])]
              : (value || []).filter((item) => item !== region);
            onChange(next);
          }}
        />
        {region}
      </label>
    ))}
  </div>
);

const createInviteForm = () => ({
  displayName: '',
  email: '',
  role: 'viewer',
  status: 'invited',
  teamMemberId: '',
  regionAccess: ['Virginia'],
  invitationMessage: '',
});

export default function UserAdminPanel({ open, onClose, actorProfile }) {
  const [users, setUsers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [inviteForm, setInviteForm] = useState(createInviteForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const roleOptions = useMemo(() => getAssignableRoles(actorProfile?.role), [actorProfile?.role]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snapshot = await getUserAdministrationSnapshot();
      setUsers(snapshot.users);
      setTeamMembers(snapshot.teamMembers);
      setDrafts(Object.fromEntries(snapshot.users.map((user) => [user.id, {
        role: user.role,
        status: user.status,
        teamMemberId: user.teamMemberId || '',
        regionAccess: user.regionAccess || [],
      }])));
    } catch (nextError) {
      setError(nextError.message || 'Unable to load user administration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  const updateDraft = (userId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...current[userId], [field]: value },
    }));
  };

  const submitInvitation = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await inviteUser(inviteForm);
      setMessage(`Invitation sent to ${inviteForm.email}.`);
      setInviteForm(createInviteForm());
      setShowInvite(false);
      await refresh();
    } catch (nextError) {
      setError(nextError.message || 'Unable to invite the user.');
    } finally {
      setLoading(false);
    }
  };

  const saveUser = async (user) => {
    const draft = drafts[user.id];
    if (!draft) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await updateUserAccess({
        userId: user.id,
        role: draft.role,
        status: draft.status,
        regionAccess: draft.regionAccess,
        teamMemberId: draft.teamMemberId,
      });
      setMessage(`${user.displayName}'s access was updated.`);
      await refresh();
    } catch (nextError) {
      setError(nextError.message || 'Unable to update the user.');
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async (user) => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await sendPasswordReset(user.email);
      setMessage(`Password-reset instructions were requested for ${user.email}.`);
    } catch (nextError) {
      setError(nextError.message || 'Unable to request a password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="User administration">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Phase 5 administration</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Users, Roles, and Access</h2>
            <p className="mt-1 text-sm text-slate-600">Invitation-only accounts, role assignment, regional access, activation, and deactivation.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={loading} onClick={() => setShowInvite((current) => !current)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50">
              {showInvite ? 'Cancel Invitation' : 'Invite User'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Close</button>
          </div>
        </header>

        <div className="space-y-6 p-6">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
          {message && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{message}</div>}

          {showInvite && (
            <form onSubmit={submitInvitation} className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
              <div className="mb-5">
                <h3 className="text-lg font-black text-slate-950">Invite a dashboard user</h3>
                <p className="mt-1 text-sm text-slate-600">The user receives a Supabase invitation and becomes active only after creating a password.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm font-bold text-slate-700">
                  Display name
                  <input required value={inviteForm.displayName} onChange={(event) => setInviteForm((current) => ({ ...current, displayName: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Email
                  <input required type="email" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Role
                  <select value={inviteForm.role} onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                    {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Linked team member
                  <select value={inviteForm.teamMemberId} onChange={(event) => setInviteForm((current) => ({ ...current, teamMemberId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                    <option value="">No team-member link</option>
                    {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
                  </select>
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">Regional access</p>
                  <RegionSelector value={inviteForm.regionAccess} onChange={(regionAccess) => setInviteForm((current) => ({ ...current, regionAccess }))} />
                </div>
                <label className="text-sm font-bold text-slate-700">
                  Invitation note
                  <textarea value={inviteForm.invitationMessage} onChange={(event) => setInviteForm((current) => ({ ...current, invitationMessage: event.target.value }))} className="mt-1 min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Optional internal reason or onboarding note" />
                </label>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <span className="font-black">Role scope:</span> {ROLE_DESCRIPTIONS[inviteForm.role]}
              </div>

              <button type="submit" disabled={loading} className="mt-5 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">Send Invitation</button>
            </form>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Application users</h3>
                <p className="text-sm text-slate-500">Accounts are deactivated rather than deleted so operational attribution and audit history remain intact.</p>
              </div>
              <button type="button" disabled={loading} onClick={refresh} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Refresh</button>
            </div>

            <div className="space-y-4">
              {users.map((user) => {
                const draft = drafts[user.id] || {};
                const isSelf = user.id === actorProfile?.id;
                return (
                  <article key={user.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-[230px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-black text-slate-950">{user.displayName}</h4>
                          {isSelf && <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">You</span>}
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(user.status)}`}>{user.status}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                        <p className="mt-2 text-xs text-slate-500">Last seen: {formatDateTime(user.lastSeenAt || user.lastLoginAt)}</p>
                        <p className="text-xs text-slate-500">Invited: {formatDateTime(user.invitedAt)}</p>
                      </div>

                      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Role
                          <select value={draft.role || user.role} onChange={(event) => updateDraft(user.id, 'role', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-800">
                            {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            {!roleOptions.some((option) => option.value === user.role) && <option value={user.role}>{ROLE_LABELS[user.role] || user.role}</option>}
                          </select>
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Status
                          <select value={draft.status || user.status} onChange={(event) => updateDraft(user.id, 'status', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-800">
                            <option value="invited">Invited</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Team member
                          <select value={draft.teamMemberId || ''} onChange={(event) => updateDraft(user.id, 'teamMemberId', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-800">
                            <option value="">No team-member link</option>
                            {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
                          </select>
                        </label>

                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Regions</p>
                          <RegionSelector value={draft.regionAccess || []} onChange={(value) => updateDraft(user.id, 'regionAccess', value)} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <p className="max-w-3xl text-xs text-slate-500">{ROLE_DESCRIPTIONS[draft.role || user.role]}</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={loading || !user.email} onClick={() => sendReset(user)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Send Password Reset</button>
                        <button type="button" disabled={loading} onClick={() => saveUser(user)} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50">Save Access</button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {!users.length && !loading && <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">No user profiles are available.</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
