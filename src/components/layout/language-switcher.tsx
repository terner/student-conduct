'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GlobeIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const locales = [
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'English' },
] as const

export function LanguageSwitcher() {
  const [locale, setLocale] = useState('th')

  const switchLocale = (code: string) => {
    setLocale(code)
    // TODO: integrate with next-intl when i18n routing is set up
    document.documentElement.lang = code
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
        <GlobeIcon className="size-4" />
        <span className="sr-only">Switch language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            disabled={locale === l.code}
            onClick={() => switchLocale(l.code)}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
