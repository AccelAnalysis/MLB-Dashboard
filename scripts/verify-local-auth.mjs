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
      return [key, raw.replace(/^['"]|['"]$/g, '')];
    }),
);

const statusEnv = parseEnvOutput(execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
}));

const url = process.env.LOCAL_SUPABASE_URL
  || statusEnv.API_URL
  || statusEnv.SUPABASE_URL;
const publishableKey = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY
  || statusEnv.PUBLISHABLE_KEY
  || statusEnv.ANON_KEY
  || statusEnv.SUPABASE_ANON_KEY;
const email = process.env.LOCAL_OWNER_EMAIL;
const password = process.env.LOCAL_OWNER_PASSWORD;

if (!url) throw new Error('The local Supabase API URL was not returned by supabase status.');
if (!publishableKey) throw new Error('The local publishable/anon key was not returned by supabase status.');
if (!email || !password) throw new Error('LOCAL_OWNER_EMAIL and LOCAL_OWNER_PASSWORD are required.');

const client = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });
if (signInError || !signInData.session) {
  throw new Error(`Local owner sign-in failed: ${signInError?.message || 'No session returned.'}`);
}

const { data: context, error: contextError } = await client.rpc('get_my_access_context');
if (contextError) throw new Error(`Current-user context failed: ${contextError.message}`);
if (!context?.id) throw new Error('Current-user context did not return a linked application profile.');
if (context.status !== 'active') throw new Error(`Expected an active profile, received: ${context.status}`);
if (context.role !== 'owner') throw new Error(`Expected owner role, received: ${context.role}`);
if (!context.permissions?.manageUsers) throw new Error('Owner context does not include manageUsers permission.');
if (!context.permissions?.manageBusiness) throw new Error('Owner context does not include manageBusiness permission.');
if (!context.permissions?.manageSales) throw new Error('Owner context does not include manageSales permission.');
if (!context.permissions?.manageProduction) throw new Error('Owner context does not include manageProduction permission.');
if (!context.permissions?.manageFinancials) throw new Error('Owner context does not include manageFinancials permission.');

const { error: touchError } = await client.rpc('touch_my_session');
if (touchError) throw new Error(`Session touch failed: ${touchError.message}`);

const { error: signOutError } = await client.auth.signOut();
if (signOutError) throw new Error(`Local owner sign-out failed: ${signOutError.message}`);

console.log('Local Phase 5 authentication smoke test passed.');
console.log(`Profile: ${context.id}`);
console.log(`Role: ${context.role}`);
