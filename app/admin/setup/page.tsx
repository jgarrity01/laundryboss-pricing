"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function AdminSetupPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [customEmail, setCustomEmail] = useState("admin@thelaundryboss.com")
  const [useCustomCredentials, setUseCustomCredentials] = useState(false)

  const setupAdmin = async () => {
    setStatus("loading")
    setMessage("")
    setCredentials(null)

    try {
      const response = await fetch("/api/setup-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: useCustomCredentials ? customEmail : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(data.message)
        setCredentials(data.credentials)
      } else {
        setStatus("error")
        setMessage(data.error || "Setup failed")
      }
    } catch (error) {
      setStatus("error")
      setMessage("Network error occurred. Please check your internet connection and try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LaundryBoss_Logo_Rtrademark-PHtdhPZbNLeNhImVtcmB7aod8ildxj.png"
              alt="The Laundry Boss"
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Admin Setup</CardTitle>
          <CardDescription>
            Set up your admin account to access the quote management system. This should only be done once per
            deployment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "idle" && (
            <>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="custom-email"
                    checked={useCustomCredentials}
                    onChange={(e) => setUseCustomCredentials(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="custom-email" className="text-sm">
                    Use custom admin email
                  </Label>
                </div>

                {useCustomCredentials && (
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="admin@yourcompany.com"
                    />
                  </div>
                )}
              </div>

              <Button onClick={setupAdmin} className="w-full" size="lg">
                Create Admin Account
              </Button>

              <div className="text-xs text-gray-500 text-center">
                This will create an admin user with secure credentials. Make sure to save the generated password.
              </div>
            </>
          )}

          {status === "loading" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Setting up admin account...</span>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">{message}</span>
              </div>

              {credentials && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-3">🔐 Admin Credentials</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <strong>Email:</strong>
                      <code className="bg-white px-2 py-1 rounded text-xs">{credentials.email}</code>
                    </div>
                    <div className="flex justify-between items-center">
                      <strong>Password:</strong>
                      <div className="flex items-center space-x-2">
                        <code className="bg-white px-2 py-1 rounded text-xs">
                          {showPassword ? credentials.password : "••••••••••••"}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                          className="h-6 w-6 p-0"
                        >
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    ⚠️ Save these credentials securely! You'll need them to access the admin panel.
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Link href="/admin/login">
                  <Button className="w-full">Go to Admin Login</Button>
                </Link>
                <Link href="/admin">
                  <Button variant="outline" className="w-full bg-transparent">
                    Go to Admin Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-start text-red-600">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium mb-1">Setup Failed</div>
                  <div>{message}</div>
                </div>
              </div>

              <Button onClick={setupAdmin} variant="outline" className="w-full bg-transparent">
                Try Again
              </Button>

              <div className="text-xs text-gray-500 text-center">
                If the problem persists, check your Supabase configuration and environment variables.
              </div>
            </div>
          )}

          <div className="pt-4 border-t text-center">
            <Link href="/admin/login" className="text-sm text-blue-600 hover:text-blue-800 underline">
              ← Back to Admin Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
