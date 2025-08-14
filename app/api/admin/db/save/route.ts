import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { key?: string; url?: string; clear?: boolean }
    const store = await cookies()

    if (body.clear) {
      store.set({
        name: "db-override-url",
        value: "",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      })
      return NextResponse.json({ ok: true, cleared: true })
    }

    if (body.key) {
      const url = (process.env as Record<string, string | undefined>)[body.key]
      if (!url) return NextResponse.json({ error: `Env var ${body.key} is not set` }, { status: 400 })
      store.set({
        name: "db-override-url",
        value: url,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
      return NextResponse.json({ ok: true, source: body.key })
    }

    if (body.url) {
      store.set({
        name: "db-override-url",
        value: body.url,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      })
      return NextResponse.json({ ok: true, source: "override" })
    }

    return NextResponse.json({ error: "Provide 'key', 'url', or 'clear': true" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to save DB override" }, { status: 500 })
  }
}
