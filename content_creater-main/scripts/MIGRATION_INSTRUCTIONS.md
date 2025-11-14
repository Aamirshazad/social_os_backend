# Role Constraint Migration Guide

This guide provides multiple ways to update your existing Supabase database with the role constraint fixes.

## 📋 What This Migration Does

1. **Removes DEFAULT 'editor'** - Prevents accidental role overwrites
2. **Sets explicit roles** - All users get explicit admin/editor/viewer roles
3. **Adds audit trigger** - Tracks all role changes in activity logs

## 🚀 Method 1: API Endpoint (Easiest)

### Prerequisites
- App must be running (`npm run dev`)
- You must be logged in as an admin
- Admin workspace configured

### Steps

1. **Check Migration Status**
   ```bash
   curl http://localhost:3000/api/admin/migrations/fix-role
   ```

2. **Run Migration**
   ```bash
   curl -X POST http://localhost:3000/api/admin/migrations/fix-role
   ```

3. **Response Example**
   ```json
   {
     "success": true,
     "message": "Role constraint migration completed successfully",
     "details": {
       "stepsDone": 4,
       "usersFixed": 0,
       "timestamp": "2025-11-04T10:30:00Z",
       "migratedBy": "admin@example.com"
     }
   }
   ```

---

## 🛠️ Method 2: CLI Script

### Prerequisites
- Node.js installed
- App running on `localhost:3000` (or configured in `.env`)
- Logged in as admin

### Steps

1. **Make script executable** (macOS/Linux only)
   ```bash
   chmod +x scripts/migrate-fix-role.js
   ```

2. **Run migration**
   ```bash
   node scripts/migrate-fix-role.js
   ```

3. **Output**
   ```
   🚀 Role Constraint Migration Script
   ====================================

   📋 Step 1: Checking migration status...

   ✅ Status Check Result:
      - Migration Ready: true
      - Users with NULL roles: 0
      - Status: All users have explicit roles

   🔧 Step 2: Running migration...

   ✅ Migration Result:
      - Success: true
      - Message: Role constraint migration completed successfully
      - Users Fixed: 0
      - Steps Done: 4
      - Executed By: admin@example.com
      - Timestamp: 2025-11-04T10:30:00.000Z

   🎉 Migration completed successfully!
   ```

---

## 📝 Method 3: Manual SQL (Direct Database Access)

### Prerequisites
- Access to Supabase SQL Editor
- Owner/admin permissions on Supabase project

### Steps

1. **Go to Supabase Dashboard**
   - Login to https://supabase.com
   - Select your project
   - Click "SQL Editor"
   - Click "New Query"

2. **Copy and paste this SQL:**

```sql
-- ============================================
-- Migration: Fix Role Constraint
-- ============================================

BEGIN;

-- Step 1: Remove DEFAULT constraint on role column
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

-- Step 2: Ensure all existing users have explicit roles
UPDATE users
SET role = 'admin'
WHERE role IS NULL;

-- Step 3: Create/replace audit function for role changes
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

-- Step 4: Create or replace trigger
DROP TRIGGER IF EXISTS audit_role_changes ON users;
CREATE TRIGGER audit_role_changes
AFTER UPDATE ON users
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION log_role_changes();

-- Step 5: Verify migration success
SELECT COUNT(*) as users_with_null_roles FROM users WHERE role IS NULL;

COMMIT;
```

3. **Click "Run"**
   - All statements should execute successfully
   - Last query should return: `users_with_null_roles: 0`

4. **Verify Success**
   ```sql
   -- Check that all users have roles
   SELECT id, email, role FROM users WHERE role IS NULL;

   -- Should return 0 rows
   ```

---

## 🔍 Method 4: TypeScript Function (Programmatic)

If you want to run this within your codebase:

```typescript
import { fixRoleConstraint } from '@/lib/supabase/migrations/runMigration'

// In an API route or server action:
const result = await fixRoleConstraint()

if (result.success) {
  console.log('Migration completed:', result.message)
} else {
  console.error('Migration failed:', result.error)
}
```

---

## ✅ Verification

After running any migration method, verify success:

1. **Check for NULL roles**
   ```sql
   SELECT COUNT(*) as users_with_null_roles FROM users WHERE role IS NULL;
   -- Should return: 0
   ```

2. **Check all users have explicit roles**
   ```sql
   SELECT COUNT(*) as total_users, COUNT(CASE WHEN role IS NOT NULL THEN 1 END) as users_with_roles FROM users;
   -- Should return same count for both columns
   ```

3. **Test role change tracking (verify audit trigger works)**

   First, make a test update:
   ```sql
   -- Update a user's role (use your actual user ID)
   UPDATE users SET role = 'admin' WHERE id = 'YOUR_USER_ID' LIMIT 1;
   ```

   Then verify it was logged:
   ```sql
   -- Check activity logs for the role change
   SELECT * FROM activity_logs WHERE action = 'role_changed' ORDER BY created_at DESC LIMIT 1;
   -- Should show your role change with old_role, new_role, changed_by, timestamp
   ```

   Or via TypeScript:
   ```typescript
   const result = await supabase
     .from('activity_logs')
     .select('*')
     .eq('action', 'role_changed')
     .order('created_at', { ascending: false })
     .limit(1)

   console.log('Last role change logged:', result.data[0])
   ```

---

## 🆘 Troubleshooting

### "Already exists" errors in SQL
**Cause**: Constraints/functions already exist from previous run
**Solution**: This is normal, safe to ignore

### "Permission denied" errors
**Cause**: Not enough Supabase permissions
**Solution**: Use Supabase dashboard with owner account

### "Cannot find module" with CLI script
**Cause**: Node.js issue
**Solution**: Run `npm install` first, then `node scripts/migrate-fix-role.js`

### API endpoint returns 401
**Cause**: Not logged in
**Solution**: Login to app first, then run API call

### API endpoint returns 403
**Cause**: Not an admin
**Solution**: Only workspace admins can run migrations

### "relation pg_triggers does not exist" error
**Cause**: Supabase doesn't allow direct access to PostgreSQL system tables
**Solution**: Use the updated verification queries instead:
```sql
-- Check for NULL roles
SELECT COUNT(*) FROM users WHERE role IS NULL;

-- Test audit trigger by making a role change
UPDATE users SET role = 'admin' WHERE id = 'YOUR_USER_ID' LIMIT 1;

-- Check if change was logged in activity_logs
SELECT * FROM activity_logs WHERE action = 'role_changed' ORDER BY created_at DESC LIMIT 1;
```

---

## 📊 What Gets Logged

After migration, all role changes are automatically logged in `activity_logs` table:

```json
{
  "workspace_id": "...",
  "user_id": "...",
  "action": "role_changed",
  "resource_type": "user",
  "resource_id": "...",
  "details": {
    "old_role": "editor",
    "new_role": "admin",
    "changed_by": "admin@example.com",
    "timestamp": "2025-11-04T10:30:00Z"
  }
}
```

---

## 🎯 Recommended Approach

**For most users:** Use Method 2 (CLI Script)
```bash
node scripts/migrate-fix-role.js
```

**For quick check:** Use Method 1 (API Endpoint with curl)
```bash
curl -X POST http://localhost:3000/api/admin/migrations/fix-role
```

**For Supabase Pro users:** Use Method 3 (Manual SQL) directly in dashboard

---

## ⚠️ Important Notes

- **Backup First**: Always backup your database before running migrations
- **Non-Destructive**: This migration only adds/updates, never deletes
- **Reversible**: Can be manually undone by re-adding DEFAULT if needed
- **Safe**: Migration is wrapped in transaction (Method 3)
- **Audited**: All changes are logged for traceability

---

## 📞 Need Help?

If migration fails:

1. Check `.env` configuration
2. Verify you have admin permissions
3. Check Supabase connection
4. Review application logs
5. Try manual SQL method (Method 3)

---

Generated: 2025-11-04
Last Updated: 2025-11-04
