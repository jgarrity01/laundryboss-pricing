"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@thelaundryboss.com")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      console.log("[v0] Client-side authentication starting...")

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error("[v0] Login error:", authError)
        setError(`Authentication failed: ${authError.message}`)
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

      const allowedRoles = ["admin", "superuser"]
      if (!allowedRoles.includes(userRole)) {
        setError(`Access denied. Role: ${userRole || "none"} (need: admin or superuser)`)
        return
      }

      console.log("[v0] Role check passed, redirecting to dashboard...")

      router.push("/admin")
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
            {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">{error}</div>}

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
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
