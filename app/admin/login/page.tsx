"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import Link from "next/link"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@thelaundryboss.com")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("") // Added success state for better user feedback
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("") // Clear success message on new attempt

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        setError("Missing Supabase configuration. Please check environment variables.")
        return
      }

      const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

      console.log("[v0] Client-side authentication starting...")
      console.log("[v0] Supabase URL:", supabaseUrl.substring(0, 30) + "...")

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error("[v0] Login error:", authError)
        if (authError.message.includes("Invalid login credentials")) {
          setError(
            "Invalid email or password. If this is a new deployment, you may need to set up the admin user first.",
          )
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Email not confirmed. Please check your email or contact support.")
        } else {
          setError(`Authentication failed: ${authError.message}`)
        }
        return
      }

      if (!authData.user) {
        setError("No user returned from authentication")
        return
      }

      console.log("[v0] Authentication successful, user:", authData.user.email)

      // Check user role
      const userRole = authData.user.user_metadata?.role || authData.user.app_metadata?.role
      console.log("[v0] User role:", userRole)
      console.log("[v0] User metadata:", authData.user.user_metadata)
      console.log("[v0] App metadata:", authData.user.app_metadata)

      const allowedRoles = ["admin", "superuser"]
      if (!allowedRoles.includes(userRole)) {
        setError(
          `Access denied. Role: ${userRole || "none"} (need: admin or superuser). If this is a new deployment, the admin user may need to be set up with proper roles.`,
        )
        return
      }

      console.log("[v0] Role check passed, redirecting to dashboard...")

      setSuccess("Login successful! Redirecting to dashboard...") // Added success feedback before redirect

      setTimeout(() => {
        router.push("/admin")
      }, 1000) // Added small delay to show success message and ensure proper redirect
    } catch (error) {
      console.error("[v0] Authentication error:", error)
      setError(`Exception: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

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
          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                {error}
                {(error.includes("Invalid login credentials") || error.includes("Access denied")) && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <Link href="/admin/setup" className="text-blue-600 hover:text-blue-800 underline text-xs">
                      Set up admin user for new deployment →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded">{success}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Authenticating..." : success ? "Redirecting..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-gray-500 mb-2">New deployment?</p>
            <Link href="/admin/setup" className="text-sm text-blue-600 hover:text-blue-800 underline">
              Set up admin user
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
