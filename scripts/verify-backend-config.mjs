const provider = String(process.env.VITE_DATA_PROVIDER || 'local').trim().toLowerCase();
const authMode = String(process.env.VITE_AUTH_MODE || provider).trim().toLowerCase();
const errors = [];
const warnings = [];

if (!['local', 'supabase'].includes(provider)) {
  errors.push(`VITE_DATA_PROVIDER must be local or supabase, received: ${provider}`);
}

if (!['local', 'supabase'].includes(authMode)) {
  errors.push(`VITE_AUTH_MODE must be local or supabase, received: ${authMode}`);
}

[
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_DB_PASSWORD',
  'VITE_DATABASE_URL',
].forEach((name) => {
  if (process.env[name]) {
    errors.push(`${name} must never be exposed to the browser. Remove the VITE_ prefix and keep the secret server/CI-only.`);
  }
});

if (provider === 'supabase' || authMode === 'supabase') {
  if (!process.env.VITE_SUPABASE_URL) errors.push('VITE_SUPABASE_URL is required when Supabase data or authentication is selected.');
  if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY) errors.push('VITE_SUPABASE_PUBLISHABLE_KEY is required when Supabase data or authentication is selected.');
}

if (provider === 'supabase' && authMode !== 'supabase') {
  errors.push('Supabase shared data requires Supabase authentication. Set VITE_AUTH_MODE=supabase.');
}

if (authMode === 'supabase') {
  if (!process.env.VITE_AUTH_REDIRECT_URL) warnings.push('VITE_AUTH_REDIRECT_URL is not set; the browser will use the current deployed path for recovery redirects.');
  const minimum = Number.parseInt(process.env.VITE_AUTH_PASSWORD_MIN_LENGTH || '12', 10);
  if (!Number.isFinite(minimum) || minimum < 8) errors.push('VITE_AUTH_PASSWORD_MIN_LENGTH must be at least 8.');
}

if (provider === 'supabase' && !process.env.DATABASE_URL) {
  warnings.push('DATABASE_URL is not set; database backup/restore scripts will not run.');
}

console.log(`Backend provider: ${provider}`);
console.log(`Authentication mode: ${authMode}`);

warnings.forEach((warning) => console.warn(`Warning: ${warning}`));

if (errors.length) {
  errors.forEach((error) => console.error(`Error: ${error}`));
  process.exit(1);
}

console.log('Backend and authentication environment configuration passed validation.');
