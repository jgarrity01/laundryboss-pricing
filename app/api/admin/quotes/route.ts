import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql() // Added await for consistency
    const rows = await sql<any[]>`
      select
        id,
        created_at,
        owner_name,
        prospect_name,
        status,
        expected_close_date,
        monthly_recurring::float as monthly_recurring,
        one_time_charges::float as one_time_charges,
        total_price_option1::float as total_price_option1,
        num_washers,
        num_dryers
      from quotes
      order by created_at desc
      limit 200;
    `
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}
