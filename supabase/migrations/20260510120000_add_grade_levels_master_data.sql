create table if not exists public.grade_levels (
  id uuid primary key default gen_random_uuid(),
  education_stage_id uuid not null references public.education_stages(id) on delete restrict,
  code text not null,
  name text not null,
  level_no integer not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grade_levels_education_stage_id_level_no_key unique (education_stage_id, level_no),
  constraint grade_levels_education_stage_id_name_key unique (education_stage_id, name)
);

alter table public.classrooms
  add column if not exists grade_level_id uuid references public.grade_levels(id) on delete restrict;

create index if not exists idx_grade_levels_stage_sort
  on public.grade_levels (education_stage_id, sort_order, level_no);

create index if not exists idx_classrooms_grade_level_id
  on public.classrooms (grade_level_id);

alter table public.grade_levels enable row level security;

drop policy if exists grade_levels_read_active on public.grade_levels;
create policy grade_levels_read_active
  on public.grade_levels
  for select
  to authenticated
  using (is_active = true);

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
          when jsonb_typeof(to_jsonb(p.role)) = 'array' then to_jsonb(p.role) ? 'admin'
          else trim(both '"' from to_jsonb(p.role)::text) = 'admin'
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
          when jsonb_typeof(to_jsonb(p.role)) = 'array' then to_jsonb(p.role) ? 'admin'
          else trim(both '"' from to_jsonb(p.role)::text) = 'admin'
        end
    )
  );

grant select on table public.grade_levels to anon;
grant select, insert, update, delete on table public.grade_levels to authenticated;

with desired as (
  select
    es.id as education_stage_id,
    v.code,
    v.name,
    v.level_no,
    es.sort_order * 100 + v.level_no as sort_order
  from public.education_stages es
  join lateral (
    values
      ('primary-1',  'ป.1', 1),
      ('primary-2',  'ป.2', 2),
      ('primary-3',  'ป.3', 3),
      ('primary-4',  'ป.4', 4),
      ('primary-5',  'ป.5', 5),
      ('primary-6',  'ป.6', 6)
  ) as v(code, name, level_no) on es.code = 'primary'

  union all

  select
    es.id,
    v.code,
    v.name,
    v.level_no,
    es.sort_order * 100 + v.level_no
  from public.education_stages es
  join lateral (
    values
      ('secondary-1', 'ม.1', 7),
      ('secondary-2', 'ม.2', 8),
      ('secondary-3', 'ม.3', 9)
  ) as v(code, name, level_no) on es.code = 'secondary'

  union all

  select
    es.id,
    v.code,
    v.name,
    v.level_no,
    es.sort_order * 100 + v.level_no
  from public.education_stages es
  join lateral (
    values
      ('highschool-4', 'ม.4', 10),
      ('highschool-5', 'ม.5', 11),
      ('highschool-6', 'ม.6', 12)
  ) as v(code, name, level_no) on es.code = 'highschool'
)
insert into public.grade_levels (education_stage_id, code, name, level_no, sort_order, is_active)
select education_stage_id, code, name, level_no, sort_order, true
from desired
on conflict (education_stage_id, level_no)
do update set
  code = excluded.code,
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

update public.classrooms c
set grade_level_id = gl.id
from public.grade_levels gl
where c.grade_level_id is null
  and gl.education_stage_id = c.education_stage_id
  and gl.level_no = c.grade_level;
