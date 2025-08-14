"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminSetupPage() {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")

  const runSeed = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl: supabaseUrl.trim(),
          supabaseServiceRoleKey: supabaseKey.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setResult(`Success: ${data.status} (id: ${data.id ?? "n/a"})`)
      } else {
        setResult(`Error: ${data.error || "Unknown error"}`)
      }
    } catch (e: any) {
      setResult(e?.message ?? "Unexpected error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>One-time Admin Setup</CardTitle>
          <CardDescription>Enter your Supabase credentials to create the initial admin user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabase-url">Supabase URL</Label>
            <Input
              id="supabase-url"
              type="url"
              placeholder="https://your-project.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supabase-key">Supabase Service Role Key</Label>
            <Input
              id="supabase-key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
          </div>
          <Button onClick={runSeed} disabled={loading || !supabaseUrl.trim() || !supabaseKey.trim()} className="w-full">
            {loading ? "Creating admin user..." : "Create Admin User"}
          </Button>
          {result && (
            <div
              className={`text-sm p-3 rounded ${
                result.startsWith("Success")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {result}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Default credentials: admin@thelaundryboss.com / ##LaundryBoss2025##tlb
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
