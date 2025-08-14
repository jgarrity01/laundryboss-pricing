import { NextResponse } from "next/server"
import { getActiveDbSource, getDbStatuses } from "@/lib/db"

export async function GET() {
  try {
    const [statuses, active] = await Promise.all([getDbStatuses(), getActiveDbSource()])
    return NextResponse.json({ statuses, active })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load DB status" }, { status: 500 })
  }
}
