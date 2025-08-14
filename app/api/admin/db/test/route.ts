import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string }
    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "Missing 'url' in body" }, { status: 400 })
    }
    // Very basic sanity check
    if (!/^postgres(ql)?:\/\//i.test(url)) {
      return NextResponse.json({ ok: false, error: "Not a Postgres URL" }, { status: 400 })
    }

    const client = neon(url)
    await client`select 1`
    const exists = await client<{ reg: string | null }[]>`select to_regclass('public.quotes') as reg`
    const hasQuotes = exists?.[0]?.reg !== null
    if (!hasQuotes) {
      return NextResponse.json({ ok: false, error: "Connected, but public.quotes not found" })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Connection failed" }, { status: 200 })
  }
}
