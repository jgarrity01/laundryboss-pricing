import { createClient } from "@supabase/supabase-js"

const ADMIN_EMAIL = "admin@thelaundryboss.com"
const ADMIN_PASSWORD = "LaundryBoss2025!"

async function setupAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing Supabase environment variables")
    console.log("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    return
  }

  console.log("🔗 Connecting to Supabase...")
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    // Try to create the admin user
    console.log("👤 Creating admin user...")
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        name: "Admin User",
      },
    })

    if (error) {
      if (error.message.includes("already registered")) {
        console.log("✅ Admin user already exists!")
        console.log(`📧 Email: ${ADMIN_EMAIL}`)
        console.log(`🔑 Password: ${ADMIN_PASSWORD}`)
      } else {
        console.error("❌ Error creating admin user:", error.message)
      }
    } else {
      console.log("✅ Admin user created successfully!")
      console.log(`📧 Email: ${ADMIN_EMAIL}`)
      console.log(`🔑 Password: ${ADMIN_PASSWORD}`)
      console.log(`🆔 User ID: ${data.user?.id}`)
    }

    console.log("\n🎉 Setup complete! You can now:")
    console.log("1. Visit /admin/setup to access the admin panel")
    console.log("2. Sign in with the credentials above")
  } catch (error) {
    console.error("❌ Unexpected error:", error)
  }
}

setupAdmin()
