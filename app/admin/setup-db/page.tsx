"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function SetupDatabase() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [databaseUrl, setDatabaseUrl] = useState("")

  const createTables = async () => {
    if (!databaseUrl.trim()) {
      setStatus("error")
      setMessage("Please enter a database URL")
      return
    }

    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/admin/create-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ databaseUrl: databaseUrl.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message)
      } else {
        setStatus("error")
        setMessage(data.error || "Failed to create tables")
      }
    } catch (error) {
      setStatus("error")
      setMessage("Network error occurred")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Database Setup</CardTitle>
            <CardDescription>Create the required tables for the Laundry Boss admin portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="database-url">Database URL</Label>
              <Input
                id="database-url"
                type="text"
                placeholder="postgres://username:password@host:port/database?sslmode=require"
                value={databaseUrl}
                onChange={(e) => setDatabaseUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Paste your Neon database URL here. It should start with "postgres://"
              </p>
            </div>

            <div className="text-sm text-gray-600">
              This will create the following tables in your database:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <code>quotes</code> - Store all pricing quotes
                </li>
                <li>
                  <code>quote_revisions</code> - Track quote changes
                </li>
              </ul>
            </div>

            <Button onClick={createTables} disabled={status === "loading" || !databaseUrl.trim()} className="w-full">
              {status === "loading" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Database Tables
            </Button>

            {status === "success" && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800">{message}</span>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{message}</span>
              </div>
            )}

            {status === "success" && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">Next steps:</p>
                <div className="space-y-2">
                  <Button variant="outline" asChild className="w-full bg-transparent">
                    <a href="/admin/login">Go to Admin Login</a>
                  </Button>
                  <Button variant="outline" asChild className="w-full bg-transparent">
                    <a href="/admin">Go to Admin Dashboard</a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
