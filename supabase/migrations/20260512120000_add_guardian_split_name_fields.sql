alter table public.guardians
  add column if not exists prefix text,
  add column if not exists first_name text,
  add column if not exists last_name text;

with parsed as (
  select
    id,
    full_name,
    case
      when full_name like 'นาย%' then 'นาย'
      when full_name like 'นางสาว%' then 'นางสาว'
      when full_name like 'นาง%' then 'นาง'
      when full_name like 'คุณ%' then 'คุณ'
      else null
    end as derived_prefix
  from public.guardians
)
update public.guardians g
set
  prefix = coalesce(g.prefix, parsed.derived_prefix),
  first_name = coalesce(
    g.first_name,
    nullif(split_part(
      trim(
        case
          when parsed.derived_prefix is not null and parsed.full_name like parsed.derived_prefix || '%'
            then substr(parsed.full_name, char_length(parsed.derived_prefix) + 1)
          else parsed.full_name
        end
      ),
      ' ',
      1
    ), '')
  ),
  last_name = coalesce(
    g.last_name,
    nullif(
      trim(
        substr(
          trim(
            case
              when parsed.derived_prefix is not null and parsed.full_name like parsed.derived_prefix || '%'
                then substr(parsed.full_name, char_length(parsed.derived_prefix) + 1)
              else parsed.full_name
            end
          ),
          strpos(
            trim(
              case
                when parsed.derived_prefix is not null and parsed.full_name like parsed.derived_prefix || '%'
                  then substr(parsed.full_name, char_length(parsed.derived_prefix) + 1)
                else parsed.full_name
              end
            ),
            ' '
          ) + 1
        )
      ),
      ''
    )
  )
from parsed
where g.id = parsed.id
  and parsed.full_name is not null
  and parsed.full_name <> '';
