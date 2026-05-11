import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const FROM_PREFIX = process.env.FROM_STUDENT_PREFIX || '2568';
const TO_PREFIX = process.env.TO_STUDENT_PREFIX || '2569';
const DRY_RUN = process.env.DRY_RUN === 'true';

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^"|"$/g, '');
    }
  } catch {
    // Allow normal process.env usage in CI/Vercel shells.
  }
  return { ...env, ...process.env };
}

function assertOk(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function main() {
  const currentYear = assertOk(
    await supabase.from('academic_years').select('id, name').eq('is_current', true).maybeSingle(),
    'load current academic year',
  );

  if (!currentYear?.id) {
    throw new Error('No current academic year found');
  }

  const enrollments = assertOk(
    await supabase
      .from('student_enrollments')
      .select('student_id, students!inner(id, student_id_number)')
      .eq('academic_year_id', currentYear.id),
    'load current student enrollments',
  );

  const candidates = enrollments
    .map((row) => row.students)
    .filter((student) => student?.id && String(student.student_id_number || '').startsWith(FROM_PREFIX))
    .map((student) => ({
      id: student.id,
      from: String(student.student_id_number),
      to: `${TO_PREFIX}${String(student.student_id_number).slice(FROM_PREFIX.length)}`,
    }));

  let updated = 0;
  for (const candidate of candidates) {
    if (DRY_RUN) continue;
    assertOk(
      await supabase
        .from('students')
        .update({ student_id_number: candidate.to })
        .eq('id', candidate.id),
      `update student ${candidate.from}`,
    );
    updated++;
  }

  console.log(JSON.stringify({
    academic_year: currentYear.name,
    from_prefix: FROM_PREFIX,
    to_prefix: TO_PREFIX,
    dry_run: DRY_RUN,
    matched: candidates.length,
    updated,
    sample: candidates.slice(0, 5),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
