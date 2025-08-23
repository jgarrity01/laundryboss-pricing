import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const customEmail = body.email

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Missing Supabase configuration. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are set.",
        },
        { status: 500 },
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const adminEmail = customEmail || "admin@thelaundryboss.com"
    const adminPassword = generateSecurePassword()

    console.log(`[SETUP] Creating admin user: ${adminEmail}`)

    // Try to create the admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: "superuser", // Use superuser role for better access
        name: "Admin User",
        created_by: "setup-script",
        created_at: new Date().toISOString(),
      },
    })

    if (error) {
      if (error.message.includes("already registered")) {
        return NextResponse.json(
          {
            success: false,
            error: `Admin user ${adminEmail} already exists. If you need to reset the password, please contact support or manually reset it in your Supabase dashboard.`,
          },
          { status: 400 },
        )
      } else {
        console.error("[SETUP] Error creating admin user:", error)
        return NextResponse.json(
          {
            error: `Failed to create admin user: ${error.message}`,
          },
          { status: 400 },
        )
      }
    }

    console.log(`[SETUP] Admin user created successfully: ${data.user?.id}`)

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully! Please save these credentials securely.",
      credentials: {
        email: adminEmail,
        password: adminPassword,
      },
      userId: data.user?.id,
    })
  } catch (error) {
    console.error("[SETUP] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error. Please check your Supabase configuration and try again.",
      },
      { status: 500 },
    )
  }
}
