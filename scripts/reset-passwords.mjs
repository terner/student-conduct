import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

// email -> new password
const accounts = {
  'admin@school.com': 'Admin123!',
  'teacher1@school.com': 'Teacher@123',
  'student1@school.com': 'Student@123',
  'student_noscore@school.local': 'Student@123',
  'student_highscore@school.local': 'Student@123',
  'student_redeemed@school.local': 'Student@123',
};

async function main() {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) { console.error('List error:', listError.message); return; }

  let ok = 0, fail = 0;
  for (const [email, password] of Object.entries(accounts)) {
    const user = users.users.find(u => u.email === email);
    if (!user) { console.log(`  ✗ ${email}: not found`); fail++; continue; }
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (error) { console.log(`  ✗ ${email}: ${error.message}`); fail++; }
    else { console.log(`  ✓ ${email}`); ok++; }
  }
  console.log(`\nDone: ${ok} ok, ${fail} failed`);
}

main().catch(console.error);
