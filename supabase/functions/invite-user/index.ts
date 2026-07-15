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
    Vary: 'Origin',
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
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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
  const invitationMessage = normalizeText(body.invitationMessage);
  const regionAccess = Array.isArray(body.regionAccess)
    ? [...new Set(body.regionAccess.map(normalizeText).filter(Boolean))]
    : [];

  if (!validEmail(email)) return json({ error: 'A valid email address is required.' }, 400, origin);
  if (displayName.length < 2) return json({ error: 'Display name must contain at least two characters.' }, 400, origin);
  if (!ALLOWED_ROLES.has(role)) return json({ error: 'The selected role is invalid.' }, 400, origin);
  if (role === 'owner' && callerProfile.role !== 'owner') {
    return json({ error: 'Only an owner can invite another owner.' }, 403, origin);
  }

  const { data: existingProfile, error: existingError } = await adminClient
    .from('user_profiles')
    .select('id, status, auth_user_id')
    .ilike('email', email)
    .maybeSingle();

  if (existingError) return json({ error: existingError.message }, 500, origin);
  if (existingProfile) {
    return json({
      error: 'A dashboard profile already exists for this email address. Update or reactivate that profile instead.',
      profileId: existingProfile.id,
      status: existingProfile.status,
    }, 409, origin);
  }

  if (teamMemberId) {
    const { data: teamMember, error: teamMemberError } = await adminClient
      .from('team_members')
      .select('id')
      .eq('id', teamMemberId)
      .maybeSingle();

    if (teamMemberError) return json({ error: teamMemberError.message }, 500, origin);
    if (!teamMember) return json({ error: 'The selected team member does not exist.' }, 400, origin);
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

  const profileId = `USR-${crypto.randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`;
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
      invitation_message: invitationMessage,
      created_by: callerProfile.id,
      updated_by: callerProfile.id,
      external_ids: { supabaseAuthUser: invitation.user.id },
      source_system: 'dashboard',
      sync_state: 'synced',
    })
    .select('id, display_name, email, role, status, team_member_id, region_access, invited_at')
    .single();

  if (insertError) {
    await adminClient.auth.admin.deleteUser(invitation.user.id).catch(() => undefined);
    return json({ error: `The invitation was rolled back because the dashboard profile could not be created: ${insertError.message}` }, 500, origin);
  }

  await adminClient.from('activity_logs').insert({
    id: `ACT-INVITE-${crypto.randomUUID().replaceAll('-', '')}`,
    actor_user_id: callerProfile.id,
    action: 'user_invited',
    entity_type: 'user_profile',
    entity_id: createdProfile.id,
    occurred_at: now,
    reason: invitationMessage || 'Application invitation created.',
    changed_fields: ['email', 'role', 'status', 'regionAccess'],
    before: null,
    after: { email, role, status: 'invited', regionAccess },
    context: { authUserId: invitation.user.id },
    source_system: 'dashboard',
    sync_state: 'synced',
  });

  return json({ invited: true, profile: createdProfile }, 201, origin);
});
