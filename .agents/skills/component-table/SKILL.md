---
name: component-table
description: Pattern for creating sortable data tables with shadcn/ui Table + search + pagination
when_to_use: anytime you are creating a table component in components/features/
---

# Sortable Table Pattern

## Component Structure

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'

interface Props {
  data: DataType[]
  loading?: boolean
}

export function DataTable({ data, loading }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Filter
  const filtered = data.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  )

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0
    const val = sortDir === 'asc'
      ? String(a[sortField]).localeCompare(String(b[sortField]))
      : String(b[sortField]).localeCompare(String(a[sortField]))
    return val
  })

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Input
        placeholder="ค้นหา..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {sorted.length === 0 ? (
        <Empty message="ไม่พบข้อมูล" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                ชื่อ {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(item => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/path/${item.id}`)}>
                <TableCell>{item.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

## Gotchas
- Table components ใช้ `'use client'` — รับ data เป็น props (Server Component parent)
- `Empty` component สำหรับ empty state
- `Spinner` สำหรับ loading state
- Click row → `router.push()` ไป detail page
