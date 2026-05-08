---
name: supabase-query
description: Standard Supabase query pattern with explicit selects, filters, and error handling
when_to_use: anytime you are writing a database query in src/lib/db/queries/
---

# Supabase Query Pattern

## Read Query (Server Client)

```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function getStudents(classroomId?: string) {
  const supabase = await createServerClient()

  let query = supabase
    .from('students')
    .select('id, first_name, last_name, student_id_number, classroom_id, status')

  if (classroomId) {
    query = query.eq('classroom_id', classroomId)
  }

  const { data, error } = await query.order('first_name', { ascending: true })

  if (error) throw new Error(`Failed to fetch students: ${error.message}`)
  return data
}
```

## Write Query (Admin Client)

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

export async function createStudent(input: StudentInsert) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('students')
    .insert(input)
    .select('id, first_name, last_name, student_id_number')
    .single()

  if (error) throw new Error(`Failed to create student: ${error.message}`)
  return data
}
```

## Rules
- **Always explicit column lists** — never `select('*')`
- Use `createServerClient()` in server components (read-only)
- Use `createAdminClient()` in server actions (write)
- Filter by `academic_year` for score/transaction queries
- Always handle error case — never assume success

## Gotchas
- `createServerClient()` is async — must `await`
- `createAdminClient()` is sync — no await needed
- For RLS-enabled tables, use server client (user context)
- For admin operations, use admin client (bypass RLS)
