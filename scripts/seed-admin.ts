/**
 * Alternative: Run from the Scripts panel (if available) or locally via:
 *   npx tsx scripts/seed-admin.ts
 */
import { createClient } from "@supabase/supabase-js"

const ADMIN_EMAIL = "admin@thelaundryboss.com"
const ADMIN_PASSWORD = "##LaundryBoss2025##tlb"
const ROLE = "superuser"

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.log("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { role: ROLE },
  } as any)

  if (!createError && created?.user) {
    console.log("Admin user created:", created.user.email)
    return
  }

  const perPage = 1000
  let found: { id: string; email?: string } | null = null
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await (supabase.auth.admin as any).listUsers({ page, perPage })
    if (error) throw error
    const users = data?.users ?? data ?? []
    found = users.find((u: any) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ?? null
    if (found || !users.length || users.length < perPage) break
  }

  if (!found) throw new Error("Admin exists but could not be found.")
  const { error: updateError } = await supabase.auth.admin.updateUserById(found.id, {
    password: ADMIN_PASSWORD,
    user_metadata: { role: ROLE },
  } as any)
  if (updateError) throw updateError

  console.log("Admin user updated:", found.email)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
