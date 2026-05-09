import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local
const content = readFileSync('.env.local', 'utf-8');
const env = {};
content.split('\n').filter(l => l && !l.startsWith('#')).forEach(line => {
  const idx = line.indexOf('=');
  if (idx < 0) return;
  const k = line.slice(0, idx).trim();
  let v = line.slice(idx + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[k] = v;
});

const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const accounts = {
  'admin@school.com': 'Admin123!',
  'teacher1@school.com': 'Teacher@123',
  'teacher2@school.com': 'Teacher@123',
  'teacher3@school.com': 'Teacher@123',
  'student1@school.com': 'Student@123',
  'student2@school.com': 'Student@123',
  'student3@school.com': 'Student@123',
  'student4@school.com': 'Student@123',
  'student5@school.com': 'Student@123',
  'student6@school.com': 'Student@123',
  'student7@school.com': 'Student@123',
  'student8@school.com': 'Student@123',
  'student9@school.com': 'Student@123',
  'student_noscore@school.local': 'Student@123',
  'student_highscore@school.local': 'Student@123',
  'student_redeemed@school.local': 'Student@123',
};

async function main() {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) { console.error('List error:', listError.message); return; }

  let ok = 0, fail = 0;
  for (const [email, password] of Object.entries(accounts)) {
    const user = users.find(u => u.email === email);
    if (!user) { console.log('  ✗ ' + email + ': not found'); fail++; continue; }
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (error) { console.log('  ✗ ' + email + ': ' + error.message); fail++; }
    else { console.log('  ✓ ' + email); ok++; }
  }
  console.log('\nDone: ' + ok + ' ok, ' + fail + ' failed');
}

main().catch(console.error);
