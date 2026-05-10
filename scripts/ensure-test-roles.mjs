import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const users = [
  {
    email: 'admin@school.com',
    password: 'Admin123!',
    role: ['superadmin'],
    full_name: 'ผู้ดูแลสูงสุด ระบบ',
    first_name: 'ผู้ดูแลสูงสุด',
    last_name: 'ระบบ',
  },
  {
    email: 'admin.approval@school.com',
    password: 'Admin123!',
    role: ['admin'],
    full_name: 'ผู้ดูแลระบบ อนุมัติ',
    first_name: 'ผู้ดูแลระบบ',
    last_name: 'อนุมัติ',
  },
];

function loadEnv() {
  const env = {};
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return env;
}

function assertOk(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function findAuthUser(supabase, email) {
  let page = 1;
  while (true) {
    const data = assertOk(await supabase.auth.admin.listUsers({ page, perPage: 1000 }), 'list auth users');
    const found = (data.users || []).find((user) => user.email === email);
    if (found) return found;
    if ((data.users || []).length < 1000) return null;
    page += 1;
  }
}

async function ensureUser(supabase, seed) {
  let authUser = await findAuthUser(supabase, seed.email);

  if (!authUser) {
    const created = assertOk(await supabase.auth.admin.createUser({
      email: seed.email,
      password: seed.password,
      email_confirm: true,
      user_metadata: {
        full_name: seed.full_name,
        first_name: seed.first_name,
        last_name: seed.last_name,
        role: seed.role,
      },
      app_metadata: { roles: seed.role },
    }), `create auth ${seed.email}`);
    authUser = created.user;
  } else {
    const updated = assertOk(await supabase.auth.admin.updateUserById(authUser.id, {
      password: seed.password,
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        full_name: seed.full_name,
        first_name: seed.first_name,
        last_name: seed.last_name,
        role: seed.role,
      },
      app_metadata: {
        ...(authUser.app_metadata || {}),
        roles: seed.role,
      },
    }), `update auth ${seed.email}`);
    authUser = updated.user;
  }

  const existing = assertOk(
    await supabase.from('profiles').select('id').eq('user_id', authUser.id).maybeSingle(),
    `load profile ${seed.email}`,
  );

  const profilePayload = {
    user_id: authUser.id,
    role: seed.role,
    full_name: seed.full_name,
    prefix: null,
    phone: null,
    is_active: true,
    must_change_password: false,
  };

  if (existing) {
    assertOk(
      await supabase.from('profiles').update(profilePayload).eq('id', existing.id),
      `update profile ${seed.email}`,
    );
  } else {
    assertOk(
      await supabase.from('profiles').insert(profilePayload),
      `create profile ${seed.email}`,
    );
  }

  return { email: seed.email, role: seed.role };
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const results = [];
  for (const user of users) {
    results.push(await ensureUser(supabase, user));
  }

  console.log(JSON.stringify({ ok: true, users: results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
