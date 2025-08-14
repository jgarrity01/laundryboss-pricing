"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

type StatusItem = {
  key: string
  status: "ok" | "missing" | "no-table" | "error"
  message?: string
}

type StatusResponse = {
  statuses: StatusItem[]
  active: { source: string | null; hasOverride: boolean }
}

export default function AdminDbPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [customUrl, setCustomUrl] = useState("")
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [initMsg, setInitMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/db/status", { cache: "no-store" })
    const data = (await res.json()) as StatusResponse
    setStatus(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const testCustom = async () => {
    setTestResult(null)
    const res = await fetch("/api/admin/db/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: customUrl.trim() }),
    })
    const data = await res.json()
    setTestResult(data)
  }

  const useEnvKey = async (key: string) => {
    setSaving(true)
    const res = await fetch("/api/admin/db/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    })
    setSaving(false)
    if (res.ok) {
      await load()
      alert(`Using database from ${key}. Reload the dashboard to apply.`)
    } else {
      const data = await res.json()
      alert(data.error || "Failed to save")
    }
  }

  const useCustomUrl = async () => {
    if (!testResult?.ok) {
      const proceed = confirm("This URL hasn't passed the test. Are you sure you want to use it?")
      if (!proceed) return
    }
    setSaving(true)
    const res = await fetch("/api/admin/db/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: customUrl.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      await load()
      alert("Custom database saved. Reload the dashboard to apply.")
    } else {
      const data = await res.json()
      alert(data.error || "Failed to save")
    }
  }

  const clearOverride = async () => {
    setSaving(true)
    const res = await fetch("/api/admin/db/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    })
    setSaving(false)
    if (res.ok) {
      await load()
      alert("Override cleared. The app will auto-detect from your env vars.")
    } else {
      const data = await res.json()
      alert(data.error || "Failed to clear")
    }
  }

  const initTables = async () => {
    setInitLoading(true)
    setInitMsg(null)
    const res = await fetch("/api/admin/db/init", { method: "POST" })
    const data = await res.json()
    setInitLoading(false)
    if (res.ok && data.ok) {
      setInitMsg("Tables created/verified successfully.")
    } else {
      setInitMsg(data.error || "Failed to create tables.")
    }
  }

  const handleButtonClick = async (key: string) => {
    await useEnvKey(key)
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Database Settings</h1>
        {status?.active?.hasOverride ? (
          <Badge variant="secondary">Override active</Badge>
        ) : (
          <Badge variant="outline">Auto-detect</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detected Environment Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Checking env vars…</div>
          ) : status?.statuses?.length ? (
            <div className="space-y-2">
              {status.statuses.map((s) => (
                <div key={s.key} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-mono text-sm">{s.key}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.status === "missing" && "Not set"}
                      {s.status === "ok" && "OK — quotes table found"}
                      {s.status === "no-table" && (s.message || "Connected, but quotes table not found")}
                      {s.status === "error" && (s.message || "Connection failed")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleButtonClick(s.key)}
                      disabled={saving || s.status === "missing"}
                      title={
                        s.status === "missing" ? "Set this env var first in your project settings" : "Use this database"
                      }
                    >
                      Use {s.status !== "ok" ? "(force)" : ""}
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-2 flex items-center gap-2">
                <Button variant="secondary" onClick={clearOverride} disabled={saving}>
                  Clear override
                </Button>
                <Button onClick={initTables} disabled={initLoading}>
                  {initLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating tables…
                    </span>
                  ) : (
                    "Create required tables"
                  )}
                </Button>
                {initMsg && <span className="text-xs text-muted-foreground">{initMsg}</span>}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No candidate env vars found.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Use a Custom Database URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="db-url">Postgres connection string</Label>
            <Input
              id="db-url"
              placeholder="postgresql://user:password@host:port/database?sslmode=require"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={testCustom} disabled={!customUrl}>
              Test connection
            </Button>
            <Button onClick={useCustomUrl} disabled={!customUrl || saving}>
              Use this database
            </Button>
          </div>
          {testResult && (
            <div className="text-sm">
              {testResult.ok ? (
                <span className="text-green-600">Success: quotes table found.</span>
              ) : (
                <span className="text-red-600">Failed: {testResult.error}</span>
              )}
            </div>
          )}
          <div className="text-xs text-muted-foreground pt-2">
            Note: This stores the URL in a secure, HttpOnly cookie used only by the server to connect. For a permanent
            setup, add the URL as an environment variable in your Vercel project settings. If the Neon integration
            conflicts with existing variables, remove or rename the conflicting ones and try again. [^2]
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
