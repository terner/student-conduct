---
name: form-validation
description: Pattern for react-hook-form + Zod form with shadcn/ui form components
when_to_use: anytime you are creating a form component in components/features/
---

# Form with Validation Pattern

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

const FormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ').max(100),
  // ...
})

type FormValues = z.infer<typeof FormSchema>

interface Props {
  initialData?: Partial<FormValues>
  onSubmit: (data: FormValues) => Promise<void>
}

export function EntityForm({ initialData, onSubmit }: Props) {
  const { toast } = useToast()
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: initialData ?? { name: '' },
  })

  const handleSubmit = async (data: FormValues) => {
    try {
      await onSubmit(data)
      toast({ title: 'บันทึกสำเร็จ' })
    } catch (err) {
      toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ชื่อ</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </form>
    </Form>
  )
}
```

## Gotchas
- Zod schema อยู่ข้างนอก component (reusable)
- `z.infer<typeof Schema>` สำหรับ type
- `FormMessage` auto-show error จาก resolver
- Disable submit button ขณะกำลัง submit
