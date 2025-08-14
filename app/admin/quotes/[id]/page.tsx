"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

type QuoteDetail = {
  quote: any
  revisions: { id: string; created_at: string; note: string | null; data: any }[]
}

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseClient()
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.replace("/admin/login")
        return
      }
      const id = params?.id as string
      const res = await fetch(`/api/admin/quotes/${id}`, { cache: "no-store" })
      if (res.ok) {
        setData(await res.json())
      }
      setLoading(false)
    }
    run()
  }, [params, router])

  if (loading) return <div className="p-6">Loading...</div>
  if (!data) return <div className="p-6">Not found</div>

  const q = data.quote

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Quote Detail</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Overview</h2>
          <div className="text-sm">
            <div>
              <span className="text-muted-foreground">ID:</span> {q.id}
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              {q.created_at ? new Date(q.created_at).toLocaleString() : "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Prospect:</span> {q.prospect_name || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Owner:</span> {q.owner_name || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span> {q.status || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Expected Close:</span>{" "}
              {q.expected_close_date ? new Date(q.expected_close_date).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-medium">Totals</h2>
          <div className="text-sm">
            <div>
              <span className="text-muted-foreground">MRR:</span>{" "}
              {q.monthly_recurring != null ? `$${Math.round(q.monthly_recurring).toLocaleString()}` : "—"}
            </div>
            <div>
              <span className="text-muted-foreground">One-time:</span>{" "}
              {q.one_time_charges != null ? `$${Math.round(q.one_time_charges).toLocaleString()}` : "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Total Price (Option 1):</span>{" "}
              {q.total_price_option1 != null ? `$${Math.round(q.total_price_option1).toLocaleString()}` : "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Machines:</span> {(q.num_washers ?? 0) + (q.num_dryers ?? 0)}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Revisions</h2>
        <div className="text-sm border rounded-md divide-y">
          {data.revisions.length ? (
            data.revisions.map((r) => (
              <div key={r.id} className="p-3">
                <div className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()} {r.note ? `• ${r.note}` : ""}
                </div>
                <pre className="mt-2 overflow-auto max-h-64 bg-muted/30 p-2 rounded text-xs">
                  {JSON.stringify(r.data, null, 2)}
                </pre>
              </div>
            ))
          ) : (
            <div className="p-3 text-muted-foreground">No revisions.</div>
          )}
        </div>
      </section>
    </main>
  )
}
