import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { apiMessage } from '@/lib/i18n/api'
import { serverMessage } from '@/lib/i18n/server'

export async function POST(request: Request) {
  try {
    const adminClient = await createAdminClient()
    
    // อัปเดต users ที่ไม่เคย login (last_login_at เป็น null)
    const { data: profiles, error: updateError } = await adminClient
      .from('profiles')
      .update({ must_change_password: true })
      .is('last_login_at', null)
      .select('id, role, last_login_at')

    if (updateError) {
      return NextResponse.json(
        {
          error: await serverMessage('authPages.forcePasswordChange.updateFailed', {
            message: updateError.message,
          }),
        },
        { status: 500 }
      )
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: await serverMessage('authPages.forcePasswordChange.noneUpdated'),
        count: 0
      })
    }

    // จัดกลุ่มตาม role
    const grouped = profiles.reduce((acc: Record<string, number>, p) => {
      const role = Array.isArray(p.role) ? p.role[0] : p.role
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      message: await serverMessage('authPages.forcePasswordChange.updated', { count: profiles.length }),
      count: profiles.length,
      details: grouped
    })
  } catch (error) {
    console.error('Force password change error:', error)
    return NextResponse.json(
      { error: apiMessage(request, 'internalError') },
      { status: 500 }
    )
  }
}
