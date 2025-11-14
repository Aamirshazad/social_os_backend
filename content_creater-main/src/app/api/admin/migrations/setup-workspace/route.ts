/**
 * API Route: /api/admin/migrations/setup-workspace
 * Creates a workspace for users who don't have one
 *
 * Usage:
 * POST /api/admin/migrations/setup-workspace
 *
 * Security: Authenticated users only
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      )
    }

    console.log(`🔧 Starting workspace setup migration for user ${user.email}...`)

    // Step 1: Check if user already has a workspace
    console.log('Step 1/4: Checking current user workspace...')
    const { data: currentUser, error: userCheckError } = await supabase
      .from('users')
      .select('workspace_id, email, full_name')
      .eq('id', user.id)
      .maybeSingle() as { data: { workspace_id?: string; email?: string; full_name?: string } | null; error: any }

    if (userCheckError) {
      console.error('❌ Failed to check user:', userCheckError)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to check user status',
          error: userCheckError.message,
        },
        { status: 500 }
      )
    }

    if (!currentUser) {
      console.log('⚠️  User not found in users table. Creating user entry...')

      // Step 2: Create workspace first
      console.log('Step 2/4: Creating new workspace...')
      const workspaceName = user.email?.split('@')[0] || 'My Workspace'

      const { data: newWorkspace, error: workspaceError } = await (supabase
        .from('workspaces') as any)
        .insert({
          name: `${workspaceName}'s Workspace`,
          description: 'Auto-generated workspace',
          is_active: true,
        })
        .select()
        .single()

      if (workspaceError) {
        console.error('❌ Failed to create workspace:', workspaceError)
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to create workspace',
            error: workspaceError.message,
          },
          { status: 500 }
        )
      }

      console.log(`✅ Created workspace: ${(newWorkspace as any).id}`)

      // Step 3: Create user entry
      console.log('Step 3/4: Creating user entry...')
      const { error: userCreateError } = await (supabase
        .from('users') as any)
        .insert({
          id: user.id,
          workspace_id: (newWorkspace as any).id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: 'admin', // First user in workspace is admin
          is_active: true,
        })

      if (userCreateError) {
        console.error('❌ Failed to create user entry:', userCreateError)
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to create user entry',
            error: userCreateError.message,
          },
          { status: 500 }
        )
      }

      console.log('✅ User entry created with admin role')

      return NextResponse.json({
        success: true,
        message: 'Workspace setup completed successfully',
        details: {
          workspaceId: (newWorkspace as any).id,
          workspaceName: (newWorkspace as any).name,
          userId: user.id,
          userEmail: user.email,
          userRole: 'admin',
          action: 'created_new_workspace_and_user',
          timestamp: new Date().toISOString(),
        },
      })
    }

    // User exists, check if they have a workspace
    if (currentUser.workspace_id) {
      console.log('✅ User already has a workspace:', currentUser.workspace_id)
      return NextResponse.json({
        success: true,
        message: 'User already has a workspace',
        details: {
          workspaceId: currentUser.workspace_id,
          userId: user.id,
          userEmail: user.email,
          action: 'no_change_needed',
        },
      })
    }

    // Step 2: User exists but has no workspace - create one and assign it
    console.log('Step 2/4: User exists but has no workspace. Creating workspace...')
    const workspaceName = currentUser.email?.split('@')[0] || 'My Workspace'

    const { data: newWorkspace, error: workspaceError } = await (supabase
      .from('workspaces') as any)
      .insert({
        name: `${workspaceName}'s Workspace`,
        description: 'Auto-generated workspace',
        is_active: true,
      })
      .select()
      .single()

    if (workspaceError) {
      console.error('❌ Failed to create workspace:', workspaceError)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create workspace',
          error: workspaceError.message,
        },
        { status: 500 }
      )
    }

    console.log(`✅ Created workspace: ${(newWorkspace as any).id}`)

    // Step 3: Update user with new workspace
    console.log('Step 3/4: Assigning workspace to user...')
    const { error: updateError } = await (supabase
      .from('users') as any)
      .update({
        workspace_id: (newWorkspace as any).id,
        role: 'admin', // Make them admin of their new workspace
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Failed to update user:', updateError)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to assign workspace to user',
          error: updateError.message,
        },
        { status: 500 }
      )
    }

    console.log('✅ User updated with workspace')

    // Step 4: Verify the update
    console.log('Step 4/4: Verifying migration...')
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('workspace_id, role')
      .eq('id', user.id)
      .single()

    if (verifyError || !(verifyUser as any)?.workspace_id) {
      console.error('❌ Verification failed')
      return NextResponse.json(
        {
          success: false,
          message: 'Migration verification failed',
        },
        { status: 500 }
      )
    }

    console.log('✅ Verification successful')
    console.log('🎉 Migration completed successfully!')

    return NextResponse.json({
      success: true,
      message: 'Workspace setup completed successfully',
      details: {
        workspaceId: (newWorkspace as any).id,
        workspaceName: (newWorkspace as any).name,
        userId: user.id,
        userEmail: user.email,
        userRole: (verifyUser as any).role,
        action: 'created_workspace_and_assigned',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Migration error:', errorMessage)

    return NextResponse.json(
      {
        success: false,
        message: 'Migration failed',
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Check workspace setup status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user's workspace status
    const { data: userData, error: checkError } = await supabase
      .from('users')
      .select('workspace_id, email, role')
      .eq('id', user.id)
      .maybeSingle() as { data: { workspace_id?: string; email?: string; role?: string } | null; error: any }

    if (checkError) {
      throw checkError
    }

    if (!userData) {
      return NextResponse.json({
        status: 'needs_setup',
        issue: 'User entry does not exist',
        description: 'You need to run the migration to create your user entry and workspace',
        needsMigration: true,
        nextStep: 'POST /api/admin/migrations/setup-workspace to run migration',
      })
    }

    if (!userData.workspace_id) {
      return NextResponse.json({
        status: 'needs_setup',
        issue: 'User has no workspace',
        description: 'You need to run the migration to create and assign a workspace',
        needsMigration: true,
        nextStep: 'POST /api/admin/migrations/setup-workspace to run migration',
      })
    }

    return NextResponse.json({
      status: 'ready',
      message: 'User has a workspace configured',
      details: {
        workspaceId: userData.workspace_id,
        userEmail: userData.email,
        userRole: userData.role,
      },
      needsMigration: false,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        status: 'error',
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
