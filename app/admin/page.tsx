"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type Metrics = {
  total_quotes: number
  avg_days_to_close: number | null
  total_mrr: string | null
  total_one_time: string | null
  total_price: string | null
  total_machines: number | null
  kiosks_front_load: number | null
  kiosks_rear_load: number | null
  kiosks_ebt: number | null
  kiosks_credit_only: number | null
}

export default function AdminDashboard() {
  const [data, setData] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch("/api/admin/metrics", { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok) {
        setData(json.data)
        setError(null)
      } else {
        setError(json.error || "No metrics available")
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LaundryBoss_Logo_Rtrademark-PHtdhPZbNLeNhImVtcmB7aod8ildxj.png"
            alt="The Laundry Boss"
            className="h-12 w-auto"
          />
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/users">
            <Button variant="outline">Users</Button>
          </Link>
          <Link href="/admin/quotes">
            <Button variant="outline">Quotes</Button>
          </Link>
          <Link href="/admin/db">
            <Button variant="outline">Database</Button>
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/admin/users" className="block">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View and manage all users, roles, and permissions</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/admin/quotes" className="block">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Quote Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Browse, search, and manage all customer quotes</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/admin/db" className="block">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Database Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Database configuration and maintenance tools</p>
            </CardContent>
          </Link>
        </Card>
      </section>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading metrics…</div>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle>Metrics unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{error}</p>
            <div className="pt-3 text-sm text-muted-foreground">
              Tips:
              <ul className="list-disc ml-5">
                <li>Open the Database page and create the required tables if needed.</li>
                <li>Pick an env var or paste a Postgres URL that has the quotes table.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Stat title="Total Quotes" value={data?.total_quotes ?? 0} />
          <Stat title="Avg Days to Close" value={data?.avg_days_to_close ? data.avg_days_to_close.toFixed(1) : "—"} />
          <Stat title="Total MRR" value={`$${formatCurrency(data?.total_mrr)}`} />
          <Stat title="One-time Total" value={`$${formatCurrency(data?.total_one_time)}`} />
          <Stat title="Total Price (Option 1)" value={`$${formatCurrency(data?.total_price)}`} />
          <Stat title="Total Machines" value={data?.total_machines ?? 0} />
          <Stat title="Kiosks Front-load" value={data?.kiosks_front_load ?? 0} />
          <Stat title="Kiosks Rear-load" value={data?.kiosks_rear_load ?? 0} />
          <Stat title="Kiosks EBT" value={data?.kiosks_ebt ?? 0} />
          <Stat title="Kiosks Credit-only" value={data?.kiosks_credit_only ?? 0} />
        </section>
      )}
    </main>
  )
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

function formatCurrency(v?: string | null) {
  const n = Number(v ?? 0)
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}
