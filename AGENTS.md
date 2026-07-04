<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Database Import Notes

- For direct Postgres access to the target Supabase project, load `.env.local` first so `SUPABASE_DB_PASSWORD` is available.
- Canonical direct connection command:
  `PGPASSWORD="$SUPABASE_DB_PASSWORD" /opt/homebrew/opt/libpq/bin/psql -h db.yiejvcmpulyervsehdzj.supabase.co -p 5432 -d postgres -U postgres`
- Do not print database passwords, tokens, or full connection strings in agent output.
- When the direct `db.<project-ref>.supabase.co` host is unreachable from the current machine, use the Supabase session pooler host from the project's Connect screen instead of inventing a new host.
- For this repo, the working import/query path was Supabase CLI linked mode, not raw `psql`:
  `supabase link --project-ref yiejvcmpulyervsehdzj --password "$SUPABASE_DB_PASSWORD" --workdir supabase`
  then
  `supabase db query --linked ... --workdir supabase`
- `supabase db query --linked -f` can apply schema/SQL files, but it does not accept raw pg_dump `COPY ... \.` payloads directly. Convert those to `INSERT` statements first when replaying `data.sql`.

## i18n Rules

- No fallback UI copy. Do not add literal fallback text such as `'Error'`, `'-'`, `'Unknown error'`, or inline translated strings in components/actions.
- No hardcoded user-facing copy. Add message keys in `messages/th.json` and `messages/en.json`, then read them through the app's i18n helpers.
- Keep domain values separate from UI translation. Enumerations, status codes, and stored data formats can stay domain-level, but all rendered labels and returned user-facing error messages must come from i18n keys.

## Table UI Rules

- Use shared table helpers instead of ad hoc table behavior:
  - `src/components/ui/sortable-table-head.tsx` for sortable headers.
  - `src/components/ui/table-helpers.ts` for nullable text, score display, joins, status lookup, and compare helpers.
- Do not render fallback literals in cells (`'-'`, `'N/A'`, raw status codes, or inline translated strings). Empty optional data should be rendered through helper policy.
- Shared data tables should support column sorting unless the table is a static sample/preview table or the data order is intentionally fixed by the domain.

## Documentation Workflow Rules

- Keep `design.md` for design system decisions, canonical UI patterns, shared layout rules, and cross-screen behavior standards only.
- Do not write implementation backlog, audit checklists, or page-specific pending work into `design.md`.
- Keep `tasklist.md` for task backlog only:
  - pending work
  - audit findings that require follow-up
  - implementation sequencing
  - page-specific cleanup lists
- When a new UI issue is found:
  - if it defines or changes a reusable pattern, update `design.md`
  - if it is work to be done, add or update an item in `tasklist.md`
- Do not mix pattern documentation and task tracking in the same section.
