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
