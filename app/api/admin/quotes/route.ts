import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: rows, error } = await supabase
      .from("quotes")
      .select(`
        id,
        created_at,
        updated_at,
        owner_name,
        prospect_name,
        customer_email,
        status,
        expected_close_date,
        monthly_base_revenue,
        projected_uplift_monthly,
        additional_savings_monthly,
        store_size,
        num_washers,
        num_dryers,
        accepts_cash,
        accepts_cards,
        has_wdf,
        wants_wdf,
        wants_pickup_delivery,
        has_payment_vendor,
        self_install,
        ai_attendant,
        ai_integration,
        kiosks,
        monthly_recurring,
        one_time_charges,
        monthly_total_48,
        present_value,
        total_to_finance,
        financed_monthly_payment,
        option2_interest_rate,
        total_price_option1,
        distributor,
        distributor_total_price,
        current_vendor,
        wdf_provider,
        additional_notes
      `)
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      console.error("[v0] Database error:", error)
      throw error
    }

    console.log("[v0] Fetched quotes:", rows?.length || 0)
    return NextResponse.json({
      quotes: rows || [],
      totalCount: rows?.length || 0,
    })
  } catch (e: any) {
    console.error("[v0] API error:", e)
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}
