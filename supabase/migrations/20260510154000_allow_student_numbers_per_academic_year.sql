alter table public.students
  drop constraint if exists students_student_id_number_key;

create index if not exists students_student_id_number_idx
  on public.students (student_id_number);
