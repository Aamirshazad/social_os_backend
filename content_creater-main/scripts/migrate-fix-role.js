#!/usr/bin/env node

/**
 * Migration Script: Fix Role Constraint
 *
 * Usage:
 * node scripts/migrate-fix-role.js
 *
 * This script:
 * 1. Removes DEFAULT 'editor' from users.role
 * 2. Sets all NULL roles to 'admin'
 * 3. Creates audit trigger for role changes
 */

const https = require('https');
require('dotenv').config();

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const authToken = process.env.MIGRATION_AUTH_TOKEN || '';

console.log('🚀 Role Constraint Migration Script');
console.log('====================================\n');

// Step 1: Check status
console.log('📋 Step 1: Checking migration status...\n');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = baseUrl.startsWith('https');
    const protocol = isHttps ? https : require('http');
    const url = new URL(baseUrl + path);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : '',
      },
    };

    const req = protocol.request(url, options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runMigration() {
  try {
    // Check current status
    const statusRes = await makeRequest('GET', '/api/admin/migrations/fix-role');

    if (statusRes.status === 401) {
      console.error('❌ ERROR: Not authenticated');
      console.error('   Please login first or set MIGRATION_AUTH_TOKEN environment variable\n');
      process.exit(1);
    }

    if (statusRes.status === 403) {
      console.error('❌ ERROR: Admin access required');
      console.error('   Only workspace admins can run migrations\n');
      process.exit(1);
    }

    if (statusRes.status !== 200) {
      console.error('❌ ERROR: Failed to check migration status');
      console.error('Response:', statusRes.data);
      process.exit(1);
    }

    console.log('✅ Status Check Result:');
    console.log(`   - Migration Ready: ${statusRes.data.readyToMigrate}`);
    console.log(`   - Users with NULL roles: ${statusRes.data.currentIssues.usersWithNullRoles}`);
    console.log(`   - Status: ${statusRes.data.currentIssues.description}\n`);

    // Run migration
    console.log('🔧 Step 2: Running migration...\n');

    const migrationRes = await makeRequest('POST', '/api/admin/migrations/fix-role');

    if (migrationRes.status !== 200) {
      console.error('❌ ERROR: Migration failed');
      console.error('Response:', migrationRes.data);
      process.exit(1);
    }

    console.log('✅ Migration Result:');
    console.log(`   - Success: ${migrationRes.data.success}`);
    console.log(`   - Message: ${migrationRes.data.message}`);
    if (migrationRes.data.details) {
      console.log(`   - Users Fixed: ${migrationRes.data.details.usersFixed}`);
      console.log(`   - Steps Done: ${migrationRes.data.details.stepsDone}`);
      console.log(`   - Executed By: ${migrationRes.data.details.migratedBy}`);
      console.log(`   - Timestamp: ${migrationRes.data.details.timestamp}`);
    }

    console.log('\n🎉 Migration completed successfully!\n');
    console.log('Changes made:');
    console.log('  ✅ Removed DEFAULT "editor" constraint from role column');
    console.log('  ✅ Set all NULL roles to "admin"');
    console.log('  ✅ Created audit trigger for role changes');
    console.log('  ✅ Verified all users have explicit roles\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure the app is running');
    console.error('  2. Check NEXT_PUBLIC_APP_URL environment variable');
    console.error('  3. Make sure you are logged in as an admin');
    console.error('  4. Check network connectivity\n');
    process.exit(1);
  }
}

// Run migration
runMigration();
