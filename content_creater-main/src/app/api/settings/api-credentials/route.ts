import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only admins can view API credentials
    if ((userData as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Return current OAuth configuration from environment variables
    // In a production system, these could be stored in a database table
    const credentials = {
      twitter: {
        clientId: process.env.TWITTER_CLIENT_ID ? '****' : '',
        clientSecret: process.env.TWITTER_CLIENT_SECRET ? '****' : '',
        configured: !!process.env.TWITTER_CLIENT_ID,
      },
      linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID ? '****' : '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET ? '****' : '',
        configured: !!process.env.LINKEDIN_CLIENT_ID,
      },
      facebook: {
        appId: process.env.FACEBOOK_CLIENT_ID ? '****' : '',
        appSecret: process.env.FACEBOOK_CLIENT_SECRET ? '****' : '',
        configured: !!process.env.FACEBOOK_CLIENT_ID,
      },
      instagram: {
        appId: process.env.INSTAGRAM_CLIENT_ID ? '****' : '',
        appSecret: process.env.INSTAGRAM_CLIENT_SECRET ? '****' : '',
        configured: !!process.env.INSTAGRAM_CLIENT_ID,
      },
    }

    return NextResponse.json(credentials)
  } catch (error) {
    console.error('API credentials GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only admins can update API credentials
    if ((userData as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await req.json()

    // Log the attempt (don't log actual credentials)
    console.log('API credentials update attempted for workspace:', (userData as any).workspace_id)

    // Note: In a production system, you would:
    // 1. Validate the credentials by testing them with the OAuth provider
    // 2. Store them encrypted in the database
    // 3. Invalidate any cached configuration
    // 4. Log this change in the audit trail

    // For now, return success (credentials are typically managed via environment variables)
    return NextResponse.json({
      success: true,
      message: 'API credentials would be updated (managed via environment variables)',
    })
  } catch (error) {
    console.error('API credentials PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
