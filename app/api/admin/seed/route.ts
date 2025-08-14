import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ADMIN_EMAIL = "admin@thelaundryboss.com"
const ADMIN_PASSWORD = "##LaundryBoss2025##tlb"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { supabaseUrl, supabaseServiceRoleKey } = body

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please provide both Supabase URL and Service Role Key.",
        },
        { status: 400 },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Try to find the user first
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listErr) throw listErr

    const existing = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())

    if (existing) {
      // Update password + set role metadata and confirm email
      const { data: upd, error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: "superuser" },
      })
      if (updErr) throw updErr
      return NextResponse.json({ ok: true, status: "updated", id: upd.user?.id })
    }

    // Create if not found
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { role: "superuser" },
    })
    if (createErr) throw createErr

    return NextResponse.json({ ok: true, status: "created", id: created.user?.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Seed failed" }, { status: 500 })
  }
}
