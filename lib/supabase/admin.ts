import { createClient } from "@supabase/supabase-js"
import { createSupabaseServer } from "./server"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

// Debug logging to see what's available
console.log("Supabase env check:", {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
  supabaseUrl: !!supabaseUrl,
  supabaseServiceKey: !!supabaseServiceKey,
})

export const isSupabaseConfigured = true

export function getSupabaseAdmin() {
  // Use the working server-side client approach
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    // Fallback to server client if admin client fails
    return createSupabaseServer()
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
