import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all quotes data
    const { data: quotes, error } = await supabase.from("quotes").select("*")

    if (error) {
      throw new Error(error.message)
    }

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          total_quotes: 0,
          avg_days_to_close: null,
          total_mrr: "0",
          total_one_time: "0",
          total_price: "0",
          total_machines: 0,
          kiosks_front_load: 0,
          kiosks_rear_load: 0,
          kiosks_ebt: 0,
          kiosks_credit_only: 0,
        },
      })
    }

    // Calculate aggregations in JavaScript
    const totalQuotes = quotes.length

    // Calculate average days to close
    const validCloseDates = quotes.filter((q) => q.expected_close_date && q.created_at)
    const avgDaysToClose =
      validCloseDates.length > 0
        ? validCloseDates.reduce((sum, q) => {
            const closeDate = new Date(q.expected_close_date)
            const createdDate = new Date(q.created_at)
            const diffDays = (closeDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
            return sum + diffDays
          }, 0) / validCloseDates.length
        : null

    // Calculate totals
    const totalMrr = quotes.reduce((sum, q) => sum + (Number.parseFloat(q.monthly_recurring) || 0), 0)
    const totalOneTime = quotes.reduce((sum, q) => sum + (Number.parseFloat(q.one_time_charges) || 0), 0)
    const totalPrice = quotes.reduce((sum, q) => sum + (Number.parseFloat(q.total_price_option1) || 0), 0)
    const totalMachines = quotes.reduce((sum, q) => sum + (q.num_washers || 0) + (q.num_dryers || 0), 0)

    // Calculate kiosk totals
    const kioskTotals = quotes.reduce(
      (totals, q) => {
        let kiosks = {}
        try {
          // Parse the JSON string stored in the kiosks field
          kiosks = typeof q.kiosks === "string" ? JSON.parse(q.kiosks) : q.kiosks || {}
        } catch (e) {
          console.warn("Failed to parse kiosks JSON for quote", q.id, e)
          kiosks = {}
        }

        return {
          frontLoad: totals.frontLoad + (kiosks.frontLoad?.selected ? kiosks.frontLoad.quantity || 0 : 0),
          rearLoad: totals.rearLoad + (kiosks.rearLoad?.selected ? kiosks.rearLoad.quantity || 0 : 0),
          ebt: totals.ebt + (kiosks.creditBill?.selected ? kiosks.creditBill.quantity || 0 : 0),
          creditOnly: totals.creditOnly + (kiosks.creditOnly?.selected ? kiosks.creditOnly.quantity || 0 : 0),
        }
      },
      { frontLoad: 0, rearLoad: 0, ebt: 0, creditOnly: 0 },
    )

    const data = {
      total_quotes: totalQuotes,
      avg_days_to_close: avgDaysToClose,
      total_mrr: totalMrr.toString(),
      total_one_time: totalOneTime.toString(),
      total_price: totalPrice.toString(),
      total_machines: totalMachines,
      kiosks_front_load: kioskTotals.frontLoad,
      kiosks_rear_load: kioskTotals.rearLoad,
      kiosks_ebt: kioskTotals.ebt,
      kiosks_credit_only: kioskTotals.creditOnly,
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    console.error("[METRICS] Error:", e?.message)
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load metrics" }, { status: 500 })
  }
}
