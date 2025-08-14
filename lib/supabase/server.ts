import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { cache } from "react"

export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export const createClient = cache(() => {
  const cookieStore = cookies()

  if (!isSupabaseConfigured) {
    console.warn("Supabase environment variables are not set. Using dummy client.")
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () =>
          Promise.resolve({
            data: { user: null },
            error: { message: "Supabase not configured. Please check environment variables." },
          }),
      },
    }
  }

  return createServerComponentClient({ cookies: () => cookieStore })
})

// Legacy function for backward compatibility
export const createServerClient = createClient
export function createSupabaseServer() {
  return createClient()
}
