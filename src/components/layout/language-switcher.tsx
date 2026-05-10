'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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

  const nextLocale = locale === 'th' ? 'en' : 'th'
  const isThai = locale === 'th'

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1 px-2 text-xs"
      onClick={() => switchLocale(nextLocale)}
      title={locale === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
    >
      <span className={isThai ? 'font-semibold text-foreground' : 'text-muted-foreground'}>TH</span>
      <span className="text-muted-foreground">|</span>
      <span className={!isThai ? 'font-semibold text-foreground' : 'text-muted-foreground'}>EN</span>
      <span className="sr-only">Switch language</span>
    </Button>
  )
}
