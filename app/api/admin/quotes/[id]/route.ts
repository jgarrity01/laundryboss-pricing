import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const sql = getSql()
    const rows = await sql<any[]>`
      select
        *
      from quotes
      where id::text = ${params.id}
      limit 1;
    `
    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    // Load revisions as well
    const revs = await sql<any[]>`
      select id, created_at, note, data
      from quote_revisions
      where quote_id = ${rows[0].id}
      order by created_at desc;
    `
    return NextResponse.json({ quote: rows[0], revisions: revs })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}
