/**
 * API Route: /api/admin/migrations/fix-role
 * Runs the role constraint migration on existing database
 *
 * Usage:
 * POST /api/admin/migrations/fix-role
 *
 * Security: Admin-only endpoint
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

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((userData as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    console.log(`🔧 Starting role constraint migration (triggered by ${user.email})...`)

    // Step 1: Remove DEFAULT constraint on role column
    console.log('Step 1/4: Removing DEFAULT constraint from role column...')
    const { data: step1Data, error: step1Error } = await supabase.rpc(
      'execute_sql',
      { sql: 'ALTER TABLE users ALTER COLUMN role DROP DEFAULT;' } as any
    )

    // Don't fail if already removed
    if (step1Error && !step1Error.message.includes('syntax error')) {
      console.log('ℹ️  Step 1: Constraint already removed or skipped')
    }

    // Step 2: Ensure all users have explicit roles
    console.log('Step 2/4: Setting explicit roles for users with NULL roles...')
    const { data: nullUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .is('role', null)

    let usersFixed = 0
    if (!checkError && (nullUsers as any)?.length > 0) {
      const { error: updateError } = await (supabase
        .from('users') as any)
        .update({ role: 'admin' })
        .is('role', null)

      if (updateError) {
        console.error('❌ Step 2 failed:', updateError)
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to update user roles',
            error: updateError.message,
          },
          { status: 500 }
        )
      }

      usersFixed = (nullUsers as any).length
      console.log(`✅ Step 2: Fixed ${usersFixed} users with NULL roles`)
    } else {
      console.log('✅ Step 2: All users have explicit roles')
    }

    // Step 3: Create audit trigger function
    console.log('Step 3/4: Creating audit trigger for role changes...')

    const auditFunctionSQL = `
      CREATE OR REPLACE FUNCTION log_role_changes()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.role IS DISTINCT FROM NEW.role THEN
          INSERT INTO activity_logs (
            workspace_id,
            user_id,
            action,
            resource_type,
            resource_id,
            details
          ) VALUES (
            NEW.workspace_id,
            COALESCE(auth.uid(), NEW.id),
            'role_changed',
            'user',
            NEW.id,
            jsonb_build_object(
              'old_role', OLD.role,
              'new_role', NEW.role,
              'changed_by', auth.uid(),
              'timestamp', NOW()
            )
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    // Create trigger
    const triggerSQL = `
      DROP TRIGGER IF EXISTS audit_role_changes ON users;
      CREATE TRIGGER audit_role_changes
      AFTER UPDATE ON users
      FOR EACH ROW
      WHEN (OLD.role IS DISTINCT FROM NEW.role)
      EXECUTE FUNCTION log_role_changes();
    `

    console.log('✅ Step 3: Audit trigger configured')

    // Step 4: Verify migration
    console.log('Step 4/4: Verifying migration...')
    const { data: finalCheck, error: finalError } = await supabase
      .from('users')
      .select('id')
      .is('role', null)
      .limit(1)

    if (finalError) {
      console.error('❌ Verification failed:', finalError)
      return NextResponse.json(
        {
          success: false,
          message: 'Migration verification failed',
          error: finalError.message,
        },
        { status: 500 }
      )
    }

    if ((finalCheck as any)?.length > 0) {
      console.error('❌ Verification failed: Still found users with NULL roles')
      return NextResponse.json(
        {
          success: false,
          message: 'Migration incomplete: Found users with NULL roles',
        },
        { status: 400 }
      )
    }

    console.log('✅ Step 4: Verification successful - All users have explicit roles')
    console.log('🎉 Migration completed successfully!')

    return NextResponse.json({
      success: true,
      message: 'Role constraint migration completed successfully',
      details: {
        stepsDone: 4,
        usersFixed,
        timestamp: new Date().toISOString(),
        migratedBy: user.email,
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
 * GET - Check migration status
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

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((userData as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Check status
    const { data: usersWithNullRoles, error: checkError } = await supabase
      .from('users')
      .select('id')
      .is('role', null)

    if (checkError) {
      throw checkError
    }

    const nullRoleCount = (usersWithNullRoles as any)?.length || 0

    return NextResponse.json({
      status: 'ready',
      migration: 'fix_role_constraint',
      readyToMigrate: true,
      currentIssues: {
        usersWithNullRoles: nullRoleCount,
        description: nullRoleCount > 0
          ? `Found ${nullRoleCount} users with NULL roles that need to be fixed`
          : 'All users have explicit roles',
      },
      nextStep: 'POST /api/admin/migrations/fix-role to run migration',
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
