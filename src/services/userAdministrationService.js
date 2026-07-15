import {
  AUTH_INVITE_FUNCTION,
  AUTH_MODE,
  AUTH_REDIRECT_URL,
} from '../config/authConfig';
import { ROLE_OPTIONS } from '../auth/permissions';
import { USER_STATUS } from '../domain/enums';
import { normalizeBackendError } from './backendErrors';
import { getCurrentAuthContext, sendPasswordReset } from './authService';
import { getSupabaseClient } from './supabaseClient';

const allowedRoles = new Set(ROLE_OPTIONS.map((option) => option.value));
const allowedStatuses = new Set(Object.values(USER_STATUS));
const cleanText = (value) => String(value || '').trim();

const localSnapshot = async () => {
  const context = await getCurrentAuthContext();
  return {
    mode: 'local',
    context,
    users: context.profile ? [{
      ...context.profile,
      teamMemberName: '',
      invitedByName: '',
    }] : [],
    teamMembers: [],
  };
};

export const getUserAdministrationSnapshot = async () => {
  if (AUTH_MODE === 'local') return localSnapshot();

  const client = getSupabaseClient();
  const [context, usersResult, teamMembersResult] = await Promise.all([
    getCurrentAuthContext({ refresh: true }),
    client
      .from('v_user_administration')
      .select('*')
      .order('display_name', { ascending: true }),
    client
      .from('team_members')
      .select('id, display_name, department, salesperson, production_staff, active')
      .eq('active', true)
      .order('display_name', { ascending: true }),
  ]);

  if (usersResult.error) throw normalizeBackendError(usersResult.error, {
    operation: 'listUsers',
    provider: 'supabase',
    fallbackMessage: 'Unable to load dashboard users.',
  });
  if (teamMembersResult.error) throw normalizeBackendError(teamMembersResult.error, {
    operation: 'listTeamMembers',
    provider: 'supabase',
    fallbackMessage: 'Unable to load team members.',
  });

  const users = (usersResult.data || []).map((row) => ({
    id: row.id,
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    status: row.status,
    teamMemberId: row.team_member_id || '',
    teamMemberName: row.team_member_name || '',
    regionAccess: row.region_access || [],
    invitedAt: row.invited_at,
    invitedByName: row.invited_by_name || '',
    acceptedAt: row.accepted_at,
    lastLoginAt: row.last_login_at,
    passwordUpdatedAt: row.password_updated_at,
    disabledReason: row.disabled_reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const teamMembers = (teamMembersResult.data || []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    department: row.department,
    salesperson: row.salesperson,
    productionStaff: row.production_staff,
    active: row.active,
  }));

  return { mode: 'supabase', context, users, teamMembers };
};

export const inviteDashboardUser = async (input) => {
  if (AUTH_MODE === 'local') {
    return { invited: false, reason: 'LOCAL_MODE' };
  }

  const role = cleanText(input.role) || 'viewer';
  if (!allowedRoles.has(role)) throw new Error('The selected role is invalid.');

  const payload = {
    email: cleanText(input.email).toLowerCase(),
    displayName: cleanText(input.displayName),
    role,
    teamMemberId: cleanText(input.teamMemberId),
    regionAccess: Array.isArray(input.regionAccess) ? input.regionAccess.map(cleanText).filter(Boolean) : [],
    redirectTo: AUTH_REDIRECT_URL,
  };

  const { data, error } = await getSupabaseClient().functions.invoke(AUTH_INVITE_FUNCTION, {
    body: payload,
  });

  if (error) throw normalizeBackendError(error, {
    operation: 'inviteUser',
    provider: 'supabase',
    fallbackMessage: 'Unable to invite the dashboard user.',
  });
  if (data?.error) throw new Error(data.error);
  return data;
};

export const updateDashboardUser = async (userId, patch = {}) => {
  if (AUTH_MODE === 'local') return { updated: false, reason: 'LOCAL_MODE' };

  const update = {};
  if (patch.displayName !== undefined) update.display_name = cleanText(patch.displayName);
  if (patch.role !== undefined) {
    if (!allowedRoles.has(patch.role)) throw new Error('The selected role is invalid.');
    update.role = patch.role;
  }
  if (patch.status !== undefined) {
    if (!allowedStatuses.has(patch.status)) throw new Error('The selected user status is invalid.');
    update.status = patch.status;
  }
  if (patch.teamMemberId !== undefined) update.team_member_id = cleanText(patch.teamMemberId) || null;
  if (patch.regionAccess !== undefined) update.region_access = Array.isArray(patch.regionAccess)
    ? patch.regionAccess.map(cleanText).filter(Boolean)
    : [];
  if (patch.disabledReason !== undefined) update.disabled_reason = cleanText(patch.disabledReason);

  const { data, error } = await getSupabaseClient()
    .from('user_profiles')
    .update(update)
    .eq('id', userId)
    .select('id, display_name, email, role, status, team_member_id, region_access, disabled_reason, updated_at')
    .single();

  if (error) throw normalizeBackendError(error, {
    operation: 'updateUser',
    provider: 'supabase',
    fallbackMessage: 'Unable to update the dashboard user.',
  });

  return { updated: true, user: data };
};

export const sendDashboardUserPasswordReset = async (email) => sendPasswordReset(email);
