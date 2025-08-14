import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { password } = await request.json()
    const userId = params.id

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data.user })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change password" },
      { status: 500 },
    )
  }
}
