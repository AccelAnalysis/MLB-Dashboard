import {
  BACKEND_PROVIDER,
  isSupabaseConfigured,
} from './backendConfig';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const normalizeMode = (value) => {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'local' || mode === 'supabase') return mode;
  return BACKEND_PROVIDER === 'supabase' ? 'supabase' : 'local';
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const browserRedirectUrl = () => {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
};

export const AUTH_MODE = normalizeMode(env.VITE_AUTH_MODE);
export const AUTH_REQUIRED = AUTH_MODE === 'supabase';
export const AUTH_REDIRECT_URL = String(env.VITE_AUTH_REDIRECT_URL || browserRedirectUrl()).trim();
export const AUTH_INVITE_FUNCTION = String(env.VITE_AUTH_INVITE_FUNCTION || 'invite-user').trim();
export const AUTH_PASSWORD_MIN_LENGTH = parsePositiveInteger(env.VITE_AUTH_PASSWORD_MIN_LENGTH, 12);

export const isAuthenticationConfigured = () => (
  AUTH_MODE === 'local'
  || (AUTH_MODE === 'supabase' && isSupabaseConfigured())
);

export const getAuthenticationConfiguration = () => ({
  mode: AUTH_MODE,
  required: AUTH_REQUIRED,
  configured: isAuthenticationConfigured(),
  redirectUrl: AUTH_REDIRECT_URL,
  inviteFunction: AUTH_INVITE_FUNCTION,
  passwordMinLength: AUTH_PASSWORD_MIN_LENGTH,
});
