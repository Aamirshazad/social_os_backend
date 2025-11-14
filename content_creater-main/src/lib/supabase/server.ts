'use server'

/**
 * Supabase Server Client
 * Use this client in server components, API routes, and server actions
 * NOTE: This module uses server-only imports (next/headers)
 * It should only be imported from API routes and server actions
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

/**
 * Create a server-side Supabase client
 * Only call this from API routes, server actions, or server components
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
    })
    throw new Error('Supabase environment variables are not configured')
  }

  let cookieStore
  try {
    cookieStore = await cookies()
  } catch (error) {
    // During build time, cookies() might not be available
    // Return a client without cookie handling for build-time operations
    console.warn('⚠️ Cookies not available (likely during build), creating client without cookie handling')
    return createServerClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )
  }

  const client = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie errors (happens in Server Components)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie errors
          }
        },
      },
    }
  )

  // Validate the client has the expected methods
  if (!client.from || typeof client.from !== 'function') {
    console.error('❌ Supabase client is missing .from method')
    throw new Error('Supabase client initialization failed')
  }

  return client
}

// Alias to match existing imports in API routes
export { createClient as createServerClient }
