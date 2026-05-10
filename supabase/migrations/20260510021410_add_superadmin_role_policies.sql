drop policy if exists grade_levels_admin_all on public.grade_levels;
create policy grade_levels_admin_all
  on public.grade_levels
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_active = true
        and case
          when jsonb_typeof(to_jsonb(p.role)) = 'array'
            then to_jsonb(p.role) ?| array['superadmin']
          else trim(both '"' from to_jsonb(p.role)::text) = 'superadmin'
        end
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_active = true
        and case
          when jsonb_typeof(to_jsonb(p.role)) = 'array'
            then to_jsonb(p.role) ?| array['superadmin']
          else trim(both '"' from to_jsonb(p.role)::text) = 'superadmin'
        end
    )
  );
