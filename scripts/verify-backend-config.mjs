const provider = String(process.env.VITE_DATA_PROVIDER || 'local').trim().toLowerCase();
const errors = [];
const warnings = [];

if (!['local', 'supabase'].includes(provider)) {
  errors.push(`VITE_DATA_PROVIDER must be local or supabase, received: ${provider}`);
}

if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  errors.push('VITE_SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser. Remove the VITE_ prefix and keep the secret server/CI-only.');
}

if (provider === 'supabase') {
  if (!process.env.VITE_SUPABASE_URL) errors.push('VITE_SUPABASE_URL is required when Supabase is selected.');
  if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY) errors.push('VITE_SUPABASE_PUBLISHABLE_KEY is required when Supabase is selected.');
  if (!process.env.DATABASE_URL) warnings.push('DATABASE_URL is not set; database backup/restore scripts will not run.');
}

console.log(`Backend provider: ${provider}`);

warnings.forEach((warning) => console.warn(`Warning: ${warning}`));

if (errors.length) {
  errors.forEach((error) => console.error(`Error: ${error}`));
  process.exit(1);
}

console.log('Backend environment configuration passed validation.');
