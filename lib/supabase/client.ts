import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Create Supabase client for client-side operations
export const supabase = createClientComponentClient()

// Check if Supabase is configured
export const isSupabaseConfigured = true

// Legacy function for backward compatibility
export function getSupabaseClient() {
  return supabase
}
