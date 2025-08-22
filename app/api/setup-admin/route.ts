import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const ADMIN_EMAIL = "admin@thelaundryboss.com"
const ADMIN_PASSWORD = "LaundryBoss2025!"

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Try to create the admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        name: "Admin User",
      },
    })

    if (error && !error.message.includes("already registered")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: error?.message.includes("already registered")
        ? "Admin user already exists"
        : "Admin user created successfully",
      credentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    })
  } catch (error) {
    console.error("Setup admin error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
