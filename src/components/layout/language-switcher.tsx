'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { GlobeIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const locales = [
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'English' },
] as const

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match?.[1]
}

export function LanguageSwitcher() {
  const router = useRouter()
  const [locale, setLocale] = useState('th')

  useEffect(() => {
    const current = getCookie('NEXT_LOCALE') || 'th'
    setLocale(current)
    document.documentElement.lang = current
  }, [])

  const switchLocale = (code: string) => {
    setLocale(code)
    document.documentElement.lang = code
    // Set cookie (1 year expiry)
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
    // Refresh to apply translations
    router.refresh()
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
