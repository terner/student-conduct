---
name: server-action
description: Template for creating a server action with Zod validation, permission check, and audit logging
when_to_use: anytime you are creating a new server action in src/lib/actions/
---

# Server Action Pattern

ใช้ template นี้สำหรับ server actions ทุกตัว:

```typescript
'use server'

import { withAuth } from '@/lib/server-action'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeObject } from '@/lib/security/sanitize'
import { z } from 'zod'

const ActionSchema = z.object({
  // fields...
})

export async function actionName(input: z.infer<typeof ActionSchema>) {
  return withAuth(async (user, profile) => {
    // 1. Validate
    const parsed = ActionSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: '...', details: parsed.error.flatten().fieldErrors as Record<string, string[]> } }
    }

    // 2. Sanitize
    const sanitized = sanitizeObject(parsed.data)

    // 3. Permission check
    if (profile.role !== 'admin') {
      return { success: false, error: { code: 'FORBIDDEN', message: '...' } }
    }

    // 4. Execute
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('table_name')
      .insert(sanitized)
      .select('id')
      .single()

    if (error) {
      return { success: false, error: { code: 'DB_ERROR', message: error.message } }
    }

    // 5. Audit log
    await supabase.from('audit_logs').insert({
      action: 'CREATE',
      entity_type: 'entity_name',
      entity_id: data.id,
      performed_by: user.id,
      new_values: sanitized,
    })

    return { success: true, data }
  })
}
```

## Gotchas
- Always use `safeParse` not `parse` — never throw in server actions
- `sanitizeObject` from security lib before DB insert
- Admin client for writes, server client for reads
- Audit log ทุก create/update/delete/void/approve
