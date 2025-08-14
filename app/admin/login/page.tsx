import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

async function signIn(formData: FormData) {
  "use server"

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return redirect("/admin/login?error=Email and password are required")
  }

  try {
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error("Login error:", authError)
      return redirect(`/admin/login?error=${encodeURIComponent(`Auth failed: ${authError.message}`)}`)
    }

    if (!authData.user) {
      return redirect("/admin/login?error=No user returned from authentication")
    }

    const userRole = authData.user.user_metadata?.role || authData.user.app_metadata?.role
    console.log("User metadata:", authData.user.user_metadata)
    console.log("App metadata:", authData.user.app_metadata)
    console.log("Detected role:", userRole)

    if (userRole !== "superuser") {
      return redirect(`/admin/login?error=Access denied. Role: ${userRole || "none"} (need: superuser)`)
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return redirect(`/admin/login?error=Exception: ${error instanceof Error ? error.message : "Unknown error"}`)
  }

  redirect("/admin")
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-teal-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LaundryBoss_Logo_Rtrademark-PHtdhPZbNLeNhImVtcmB7aod8ildxj.png"
              alt="The Laundry Boss"
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-800">Laundry Boss Quote Tool Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-4">
            {searchParams.error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                {searchParams.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue="admin@thelaundryboss.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
