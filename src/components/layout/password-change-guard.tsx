'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function PasswordChangeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkPasswordChangeRequired = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('must_change_password')
            .eq('user_id', user.id)
            .single()
          
          if (profile?.must_change_password) {
            const currentPath = window.location.pathname
            if (currentPath !== '/first-password' && currentPath !== '/logout') {
              router.push('/first-password')
            }
          }
        }
      } catch (error) {
        console.error('Password change guard error:', error)
      }
    }

    checkPasswordChangeRequired()
  }, [router, supabase])

  return <>{children}</>
}