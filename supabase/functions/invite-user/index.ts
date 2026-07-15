import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ROLES = new Set([
  'owner',
  'business_admin',
  'operations_admin',
  'sales_manager',
  'salesperson',
  'production_manager',
  'viewer',
  'wallboard',
  'developer_support',
]);

const json = (body: unknown, status = 200, origin = '*') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  },
});

const allowedOrigin = (requestOrigin: string | null) => {
  const configured = String(Deno.env.get('AUTH_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!requestOrigin) return configured[0] || '*';
  if (!configured.length) return requestOrigin;
  return configured.includes(requestOrigin) ? requestOrigin : configured[0];
};

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const normalizeText = (value: unknown) => String(value || '').trim();

Deno.serve(async (request) => {
  const origin = allowedOrigin(request.headers.get('Origin'));

  if (request.method === 'OPTIONS') return json({}, 204, origin);
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'The invitation service is not configured.' }, 500, origin);
  }

  if (!authorization) return json({ error: 'Authentication is required.' }, 401, origin);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return json({ error: 'The authentication session is invalid or expired.' }, 401, origin);
  }

  const { data: callerProfile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('id, role, status')
    .eq('auth_user_id', callerData.user.id)
    .maybeSingle();

  if (profileError || !callerProfile || callerProfile.status !== 'active') {
    return json({ error: 'An active MLB Dashboard profile is required.' }, 403, origin);
  }

  if (!['owner', 'business_admin'].includes(callerProfile.role)) {
    return json({ error: 'Your role cannot invite dashboard users.' }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'A valid JSON request body is required.' }, 400, origin);
  }

  const email = normalizeEmail(body.email);
  const displayName = normalizeText(body.displayName);
  const role = normalizeText(body.role) || 'viewer';
  const teamMemberId = normalizeText(body.teamMemberId) || null;
  const regionAccess = Array.isArray(body.regionAccess)
    ? body.regionAccess.map(normalizeText).filter(Boolean)
    : [];

  if (!email || !email.includes('@')) return json({ error: 'A valid email address is required.' }, 400, origin);
  if (displayName.length < 2) return json({ error: 'Display name must contain at least two characters.' }, 400, origin);
  if (!ALLOWED_ROLES.has(role)) return json({ error: 'The selected role is invalid.' }, 400, origin);
  if (role === 'owner' && callerProfile.role !== 'owner') {
    return json({ error: 'Only an owner can invite another owner.' }, 403, origin);
  }

  const { data: existingProfile } = await adminClient
    .from('user_profiles')
    .select('id, status, auth_user_id')
    .ilike('email', email)
    .maybeSingle();

  if (existingProfile) {
    return json({
      error: 'A dashboard profile already exists for this email address.',
      profileId: existingProfile.id,
      status: existingProfile.status,
    }, 409, origin);
  }

  const configuredRedirect = normalizeText(Deno.env.get('AUTH_INVITE_REDIRECT_URL'));
  const requestedRedirect = normalizeText(body.redirectTo);
  const redirectTo = configuredRedirect || requestedRedirect || undefined;

  const { data: invitation, error: invitationError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      display_name: displayName,
      mlb_dashboard_role: role,
    },
  });

  if (invitationError || !invitation.user) {
    return json({ error: invitationError?.message || 'Unable to create the authentication invitation.' }, 400, origin);
  }

  const profileId = `USR-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const { data: createdProfile, error: insertError } = await adminClient
    .from('user_profiles')
    .insert({
      id: profileId,
      auth_user_id: invitation.user.id,
      display_name: displayName,
      email,
      role,
      status: 'invited',
      team_member_id: teamMemberId,
      region_access: regionAccess,
      invited_at: now,
      invited_by: callerProfile.id,
      external_ids: { supabaseAuthUser: invitation.user.id },
      source_system: 'dashboard',
      sync_state: 'synced',
    })
    .select('id, display_name, email, role, status, region_access, invited_at')
    .single();

  if (insertError) {
    await adminClient.auth.admin.deleteUser(invitation.user.id, true);
    return json({ error: `The invitation was rolled back because the dashboard profile could not be created: ${insertError.message}` }, 500, origin);
  }

  return json({
    invited: true,
    profile: createdProfile,
  }, 201, origin);
});
