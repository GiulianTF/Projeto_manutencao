import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sessão inválida.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'A função não está configurada no Supabase.' }, 500);
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const accessToken = authorization.slice('Bearer '.length).trim();
  const { data: authData, error: authError } = await caller.auth.getUser(accessToken);
  if (authError || !authData.user) return json({ error: 'Sessão inválida ou expirada.' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError) return json({ error: 'Não foi possível validar o perfil administrador.' }, 500);
  if (!profile?.active || profile.role !== 'admin') {
    return json({ error: 'Somente um administrador ativo pode cadastrar colaboradores.' }, 403);
  }

  let body: { action?: string; full_name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Dados inválidos.' }, 400);
  }

  if (body.action !== 'create') return json({ error: 'Ação inválida.' }, 400);
  const fullName = body.full_name?.trim() ?? '';
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  if (!fullName || fullName.length > 120) return json({ error: 'Informe um nome com até 120 caracteres.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400);
  if (password.length < 8) return json({ error: 'A senha inicial deve ter pelo menos 8 caracteres.' }, 400);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) {
    const message = createError?.message.toLowerCase().includes('already')
      ? 'Já existe uma conta com esse e-mail.'
      : 'Não foi possível criar a conta. Confira o e-mail e tente novamente.';
    return json({ error: message }, 400);
  }

  // O gatilho on_auth_user_created cria o perfil como técnico.
  const { data: newProfile, error: newProfileError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', created.user.id)
    .single();
  if (newProfileError || !newProfile) {
    // Evita deixar uma conta sem perfil se a criação do perfil falhar.
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: 'A conta foi criada, mas o perfil não pôde ser preparado.' }, 500);
  }

  return json(newProfile, 201);
});
