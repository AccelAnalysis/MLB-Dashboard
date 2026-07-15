import {
  AUTH_MODE,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_REDIRECT_URL,
  isAuthenticationConfigured,
} from '../config/authConfig';
import { USER_ROLE, USER_STATUS } from '../domain/enums';
import { mergeServerCapabilities } from '../auth/permissions';
import { BackendError, normalizeBackendError } from './backendErrors';
import { getSupabaseClient } from './supabaseClient';

const LOCAL_PROFILE = Object.freeze({
  id: 'USR-LOCAL-OWNER',
  authUserId: 'local-development-user',
  displayName: 'Local Development Owner',
  email: 'local@mlb-dashboard.invalid',
  role: USER_ROLE.OWNER,
  status: USER_STATUS.ACTIVE,
  teamMemberId: '',
  regionAccess: ['Virginia', 'Carolina'],
  lastLoginAt: '',
  invitedAt: '',
  acceptedAt: '',
  passwordUpdatedAt: '',
  disabledReason: '',
  capabilities: mergeServerCapabilities(USER_ROLE.OWNER),
});

let cachedContext = null;

const createSnapshot = (input = {}) => ({
  mode: AUTH_MODE,
  configured: isAuthenticationConfigured(),
  ready: true,
  authenticated: false,
  accessState: 'signed_out',
  event: input.event || 'INITIAL_SESSION',
  session: input.session || null,
  user: input.session?.user || input.user || null,
  profile: input.profile || null,
  error: input.error || null,
  recoveryRequired: Boolean(input.recoveryRequired),
  ...input,
});

const enrichProfile = (profile) => {
  if (!profile || !profile.id) return null;
  return {
    ...profile,
    capabilities: mergeServerCapabilities(profile.role, profile.capabilities),
  };
};

const authError = (error, operation, fallbackMessage) => normalizeBackendError(error, {
  code: error?.code || 'AUTHENTICATION_ERROR',
  operation,
  provider: AUTH_MODE,
  fallbackMessage,
  recoverable: true,
});

const resolveSupabaseContext = async ({
  session: suppliedSession,
  event = 'INITIAL_SESSION',
  recordLogin = false,
} = {}) => {
  const client = getSupabaseClient();
  let session = suppliedSession;

  if (session === undefined) {
    const { data, error } = await client.auth.getSession();
    if (error) throw authError(error, 'getSession', 'Unable to read the authentication session.');
    session = data.session;
  }

  if (!session?.user) {
    const snapshot = createSnapshot({ event, session: null });
    cachedContext = snapshot;
    return snapshot;
  }

  try {
    const { data, error } = await client.rpc(recordLogin ? 'record_app_login' : 'get_current_user_context');
    if (error) throw error;

    const profile = enrichProfile(data);
    if (!profile) {
      const snapshot = createSnapshot({
        event,
        session,
        authenticated: true,
        user: session.user,
        accessState: 'unlinked',
        error: new BackendError('No MLB Dashboard profile is linked to this authentication account.', {
          code: 'AUTH_PROFILE_NOT_LINKED',
          operation: 'resolveProfile',
          provider: 'supabase',
          recoverable: false,
        }),
      });
      cachedContext = snapshot;
      return snapshot;
    }

    const accessState = profile.status === USER_STATUS.ACTIVE
      ? 'active'
      : profile.status === USER_STATUS.INACTIVE
        ? 'inactive'
        : 'invited';

    const snapshot = createSnapshot({
      event,
      session,
      authenticated: true,
      user: session.user,
      profile,
      accessState,
      recoveryRequired: event === 'PASSWORD_RECOVERY',
    });
    cachedContext = snapshot;
    return snapshot;
  } catch (error) {
    const normalized = authError(error, recordLogin ? 'recordLogin' : 'getCurrentUserContext', 'Unable to resolve the MLB Dashboard user profile.');
    const message = String(normalized.message || '').toLowerCase();
    const accessState = message.includes('inactive')
      ? 'inactive'
      : message.includes('no mlb dashboard user profile') || message.includes('not linked')
        ? 'unlinked'
        : 'error';

    const snapshot = createSnapshot({
      event,
      session,
      authenticated: true,
      user: session.user,
      accessState,
      error: normalized,
      recoveryRequired: event === 'PASSWORD_RECOVERY',
    });
    cachedContext = snapshot;
    return snapshot;
  }
};

export const getAuthSnapshot = async ({ recordLogin = true } = {}) => {
  if (AUTH_MODE === 'local') {
    const snapshot = createSnapshot({
      mode: 'local',
      authenticated: true,
      accessState: 'active',
      user: { id: LOCAL_PROFILE.authUserId, email: LOCAL_PROFILE.email },
      profile: LOCAL_PROFILE,
      event: 'LOCAL_SESSION',
    });
    cachedContext = snapshot;
    return snapshot;
  }

  if (!isAuthenticationConfigured()) {
    const snapshot = createSnapshot({
      configured: false,
      accessState: 'configuration_error',
      error: new BackendError('Supabase authentication is selected but is not configured.', {
        code: 'AUTH_CONFIGURATION_ERROR',
        operation: 'initializeAuth',
        provider: 'supabase',
        recoverable: true,
      }),
    });
    cachedContext = snapshot;
    return snapshot;
  }

  return resolveSupabaseContext({ recordLogin });
};

export const getCurrentAuthContext = async ({ refresh = false } = {}) => {
  if (!refresh && cachedContext) return cachedContext;
  return getAuthSnapshot({ recordLogin: false });
};

export const subscribeToAuthChanges = (onChange) => {
  if (AUTH_MODE === 'local') return () => {};

  const client = getSupabaseClient();
  const { data } = client.auth.onAuthStateChange((event, session) => {
    window.setTimeout(async () => {
      const snapshot = await resolveSupabaseContext({
        session,
        event,
        recordLogin: Boolean(session?.user) && event !== 'TOKEN_REFRESHED',
      });
      onChange(snapshot);
    }, 0);
  });

  return () => data.subscription.unsubscribe();
};

export const signInWithPassword = async ({ email, password }) => {
  if (AUTH_MODE === 'local') return getAuthSnapshot();

  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: String(email || '').trim().toLowerCase(),
    password: String(password || ''),
  });

  if (error) throw authError(error, 'signInWithPassword', 'Unable to sign in.');
  return resolveSupabaseContext({ session: data.session, event: 'SIGNED_IN', recordLogin: true });
};

export const signOut = async () => {
  cachedContext = null;
  if (AUTH_MODE === 'local') return getAuthSnapshot();

  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw authError(error, 'signOut', 'Unable to sign out.');
  return createSnapshot({ event: 'SIGNED_OUT' });
};

export const sendPasswordReset = async (email) => {
  if (AUTH_MODE === 'local') {
    throw new BackendError('Password recovery is not used in local-development mode.', {
      code: 'AUTH_LOCAL_MODE',
      operation: 'sendPasswordReset',
      provider: 'local',
    });
  }

  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
    String(email || '').trim().toLowerCase(),
    { redirectTo: AUTH_REDIRECT_URL },
  );
  if (error) throw authError(error, 'sendPasswordReset', 'Unable to send the password-reset email.');
  return { sent: true };
};

export const updatePassword = async (password) => {
  const nextPassword = String(password || '');
  if (nextPassword.length < AUTH_PASSWORD_MIN_LENGTH) {
    throw new BackendError(`Password must contain at least ${AUTH_PASSWORD_MIN_LENGTH} characters.`, {
      code: 'AUTH_PASSWORD_TOO_SHORT',
      operation: 'updatePassword',
      provider: AUTH_MODE,
    });
  }

  if (AUTH_MODE === 'local') return { updated: true };

  const client = getSupabaseClient();
  const { error } = await client.auth.updateUser({ password: nextPassword });
  if (error) throw authError(error, 'updatePassword', 'Unable to update the password.');

  const { error: auditError } = await client.rpc('record_password_update');
  if (auditError) throw authError(auditError, 'recordPasswordUpdate', 'Password changed, but the profile timestamp could not be recorded.');

  return { updated: true };
};

export const updateMyDisplayName = async (displayName) => {
  if (AUTH_MODE === 'local') return LOCAL_PROFILE;

  const { data, error } = await getSupabaseClient().rpc('update_my_profile', {
    p_display_name: String(displayName || '').trim(),
  });
  if (error) throw authError(error, 'updateMyProfile', 'Unable to update the profile.');

  const profile = enrichProfile(data);
  if (cachedContext) cachedContext = { ...cachedContext, profile };
  return profile;
};

export const clearCachedAuthContext = () => {
  cachedContext = null;
};
