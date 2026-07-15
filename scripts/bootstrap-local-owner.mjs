import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const parseEnvOutput = (output) => Object.fromEntries(
  String(output || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      const key = line.slice(0, separator).trim();
      const raw = line.slice(separator + 1).trim();
      const value = raw.replace(/^['"]|['"]$/g, '');
      return [key, value];
    }),
);

const readLocalSupabaseEnvironment = () => {
  try {
    return parseEnvOutput(execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }));
  } catch (error) {
    throw new Error(`Unable to read the local Supabase status. Start it first with npm run supabase:start. ${error.stderr?.toString() || error.message}`);
  }
};

const requireValue = (value, label) => {
  if (!value) throw new Error(`${label} is required.`);
  return value;
};

const email = requireValue(process.env.LOCAL_OWNER_EMAIL, 'LOCAL_OWNER_EMAIL');
const password = requireValue(process.env.LOCAL_OWNER_PASSWORD, 'LOCAL_OWNER_PASSWORD');
const displayName = process.env.LOCAL_OWNER_NAME || 'Local MLB Owner';
const profileId = process.env.LOCAL_OWNER_PROFILE_ID || 'USR-LOCAL-OWNER';

if (password.length < 12) throw new Error('LOCAL_OWNER_PASSWORD must contain at least 12 characters.');

const statusEnv = readLocalSupabaseEnvironment();
const supabaseUrl = process.env.LOCAL_SUPABASE_URL
  || statusEnv.API_URL
  || statusEnv.SUPABASE_URL;
const serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY
  || statusEnv.SERVICE_ROLE_KEY
  || statusEnv.SUPABASE_SERVICE_ROLE_KEY;

requireValue(supabaseUrl, 'Local Supabase API URL');
requireValue(serviceRoleKey, 'Local Supabase service-role key');

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const findExistingUser = async () => {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
};

let authUser = await findExistingUser();

if (!authUser) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error) throw error;
  authUser = data.user;
} else {
  const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...authUser.user_metadata,
      display_name: displayName,
    },
  });
  if (error) throw error;
  authUser = data.user;
}

const { data: profile, error: profileError } = await admin.rpc('bootstrap_first_owner', {
  p_profile_id: profileId,
  p_auth_user_id: authUser.id,
  p_display_name: displayName,
  p_email: email,
});

if (profileError) throw profileError;

console.log('Local Phase 5 owner is ready.');
console.log(`Email: ${email}`);
console.log(`Profile: ${profile.id}`);
console.log('The service-role key was read from the local Supabase CLI and was not written to disk.');
