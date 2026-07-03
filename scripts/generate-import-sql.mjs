import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataPath = new URL('../supabase/backups/khaowang-2026-06-04/data.sql', import.meta.url);
const outDir = fileURLToPath(new URL('../supabase/generated-import/', import.meta.url));

const targets = new Set([
  'auth.users',
  'auth.identities',
  'auth.sessions',
  'auth.mfa_amr_claims',
  'auth.refresh_tokens',
  'public.academic_years',
  'public.profiles',
  'public.action_logs',
  'public.audit_logs',
  'public.education_stages',
  'public.grade_levels',
  'public.classrooms',
  'public.students',
  'public.bond_documents',
  'public.guardians',
  'public.score_categories',
  'public.score_transactions',
  'public.intervention_logs',
  'public.monthly_reports',
  'public.notifications',
  'public.pdpa_consents',
  'public.permissions',
  'public.role_permissions',
  'public.score_transaction_evidence',
  'public.settings',
  'public.student_enrollments',
  'public.student_guardians',
  'public.teachers',
  'public.teacher_classrooms',
  'public.teacher_positions',
]);

function parseCopyField(field) {
  if (field === '\\N') return 'NULL';

  const decoded = field
    .replace(/\\\\/g, '\\')
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r');

  return `'${decoded.replace(/'/g, "''")}'`;
}

const sql = await fs.readFile(dataPath, 'utf8');
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const generated = [];
const lines = sql.split('\n');

for (let i = 0; i < lines.length; i += 1) {
  const header = lines[i];
  const match = header.match(/^COPY\s+"([^"]+)"\."([^"]+)"\s*\(([^)]+)\) FROM stdin;$/);
  if (!match) continue;

  const [, schema, table, colsRaw] = match;
  const key = `${schema}.${table}`;
  const rows = [];

  for (i += 1; i < lines.length; i += 1) {
    if (lines[i] === '\\.') break;
    rows.push(lines[i]);
  }

  if (!targets.has(key) || !rows.length) continue;

  const cols = colsRaw.split(',').map((col) => col.trim());
  let fileNo = 1;

  for (let start = 0; start < rows.length; start += 200) {
    const chunk = rows.slice(start, start + 200);
    const values = chunk
      .map((line) => {
        const fields = line.split('\t').map(parseCopyField);
        return `(${fields.join(', ')})`;
      })
      .join(',\n');

    const statement =
      `insert into "${schema}"."${table}" (${cols.join(', ')}) values\n` +
      `${values};\n`;

    const filename = `${schema}__${table}__${String(fileNo).padStart(3, '0')}.sql`;
    await fs.writeFile(path.join(outDir, filename), statement, 'utf8');
    fileNo += 1;
  }

  generated.push(`${key}:${rows.length}`);
}

console.log(generated.join('\n'));
