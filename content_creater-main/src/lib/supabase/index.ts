/**
 * Supabase Client Exports (Client-only)
 * Import from here only in client components/services.
 * Server utilities should import from `@/lib/supabase/server` directly.
 */
"use client"

export { createClient as createBrowserClient, supabase } from './client'
export type { Database } from './types'
