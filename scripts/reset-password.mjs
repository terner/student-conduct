import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^"|"$/g, '').replace(/^'|"$/g, '');
      return [key, value];
    })
);

const url = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function resetUserPassword(email) {
  // 1. หา user จาก auth.users โดยตรง (อาจไม่มี profile)
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers();

  if (listError) {
    console.error('List users error:', listError.message);
    return;
  }

  const targetUser = users.find(u => u.email === email);

  if (!targetUser) {
    console.log(`ไม่พบ user สำหรับ email: ${email}`);
    console.log('\nUsers ทั้งหมดในระบบ:');
    users.forEach(u => console.log(`- ${u.email} (ID: ${u.id})`));
    return;
  }

  console.log('พบ user ใน auth.users:');
  console.log('- ID:', targetUser.id);
  console.log('- Email:', targetUser.email);
  console.log('- Created at:', targetUser.created_at);

  // 2. Reset password ผ่าน Supabase Auth admin
  const newPassword = 'Reset123!';
  const { data: updateData, error: updateError } = await admin.auth.admin.updateUserById(
    targetUser.id,
    { password: newPassword }
  );

  if (updateError) {
    console.error('Reset password ล้มเหลว:', updateError.message);
    return;
  }

  console.log('\n✅ Reset password สำเร็จ!');
  console.log('- Email:', email);
  console.log('- New password:', newPassword);
  console.log('\nกรุณาเปลี่ยน password หลังจาก login');
}

const email = process.argv[2] || 'jhbhb@kjbkjb.com';
resetUserPassword(email);
