import { AUTH_INVITE_FUNCTION } from '../config/authConfig';
import { getInviteRedirectUrl } from './authService';
import { normalizeBackendError } from './backendErrors';
import { getSupabaseClient } from './supabaseClient';

const normalizeError = (error, operation, fallbackMessage) => normalizeBackendError(error, {
  code: error?.code || 'USER_ADMIN_ERROR',
  operation,
  provider: 'supabase',
  fallbackMessage,
  recoverable: true,
});

const normalizeProfileRow = (row) => ({
  id: row.id,
  authUserId: row.auth_user_id || '',
  displayName: row.display_name || '',
  email: row.email || '',
  role: row.role || 'viewer',
  status: row.status || 'invited',
  teamMemberId: row.team_member_id || '',
  regionAccess: Array.isArray(row.region_access) ? row.region_access : [],
  invitedAt: row.invited_at || '',
  activatedAt: row.activated_at || '',
  deactivatedAt: row.deactivated_at || '',
  lastLoginAt: row.last_login_at || '',
  lastSeenAt: row.last_seen_at || '',
  invitedBy: row.invited_by || '',
});

export const listUserProfiles = async () => {
  const { data, error } = await getSupabaseClient()
    .from('user_profiles')
    .select('id, auth_user_id, display_name, email, role, status, team_member_id, region_access, invited_at, activated_at, deactivated_at, last_login_at, last_seen_at, invited_by')
    .order('display_name', { ascending: true });

  if (error) throw normalizeError(error, 'listUserProfiles', 'Unable to load dashboard users.');
  return (data || []).map(normalizeProfileRow);
};

export const listAssignableTeamMembers = async () => {
  const { data, error } = await getSupabaseClient()
    .from('team_members')
    .select('id, display_name, department, salesperson, production_staff, active')
    .eq('active', true)
    .order('display_name', { ascending: true });

  if (error) throw normalizeError(error, 'listTeamMembers', 'Unable to load team members.');
  return (data || []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    department: row.department || '',
    salesperson: Boolean(row.salesperson),
    productionStaff: Boolean(row.production_staff),
  }));
};

export const getUserAdministrationSnapshot = async () => {
  const [users, teamMembers] = await Promise.all([
    listUserProfiles(),
    listAssignableTeamMembers(),
  ]);

  return { users, teamMembers };
};

export const inviteUser = async (input) => {
  const { data, error } = await getSupabaseClient().functions.invoke(AUTH_INVITE_FUNCTION, {
    body: {
      email: String(input.email || '').trim().toLowerCase(),
      displayName: String(input.displayName || '').trim(),
      role: input.role,
      teamMemberId: input.teamMemberId || null,
      regionAccess: Array.isArray(input.regionAccess) ? input.regionAccess : [],
      invitationMessage: String(input.invitationMessage || '').trim(),
      redirectTo: getInviteRedirectUrl(),
    },
  });

  if (error) {
    let details = error;
    try {
      const responseBody = await error.context?.json?.();
      if (responseBody?.error) details = new Error(responseBody.error);
    } catch {
      // Keep the original function error when the response body is unavailable.
    }
    throw normalizeError(details, 'inviteUser', 'Unable to invite the dashboard user.');
  }

  if (data?.error) throw normalizeError(new Error(data.error), 'inviteUser', data.error);
  return data?.profile || data;
};

export const updateUserAccess = async ({
  userId,
  role,
  status,
  regionAccess,
  teamMemberId,
}) => {
  const { data, error } = await getSupabaseClient().rpc('update_user_access', {
    p_user_id: userId,
    p_role: role,
    p_status: status,
    p_region_access: Array.isArray(regionAccess) ? regionAccess : [],
    p_team_member_id: teamMemberId || null,
  });

  if (error) throw normalizeError(error, 'updateUserAccess', 'Unable to update the user role or status.');
  return data;
};
