create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role && array['admin'::text, 'superadmin'::text]
  );
$function$;
