"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function SetupAdminPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)

  const setupAdmin = async () => {
    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/setup-admin", {
        method: "POST",
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
      setMessage("Network error occurred")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Admin Setup</CardTitle>
          <CardDescription>Set up your admin account to access the quote management system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "idle" && (
            <Button onClick={setupAdmin} className="w-full" size="lg">
              Create Admin Account
            </Button>
          )}

          {status === "loading" && (
            <div className="flex items-center justify-center py-4">
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
                  <h3 className="font-medium text-green-800 mb-2">Admin Credentials:</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Email:</strong> {credentials.email}
                    </div>
                    <div>
                      <strong>Password:</strong> {credentials.password}
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={() => (window.location.href = "/admin/setup")} className="w-full" variant="outline">
                Go to Admin Panel
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">{message}</span>
              </div>

              <Button onClick={setupAdmin} className="w-full bg-transparent" variant="outline">
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
