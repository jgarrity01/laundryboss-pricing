import { createClient } from "@supabase/supabase-js"

type SqlClient = <T = any>(strings: TemplateStringsArray, ...values: any[]) => Promise<T>

let cached: { sql: SqlClient; source: string } | null = null

function createSupabaseSqlClient(): SqlClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const sqlClient: SqlClient = async <T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T> => {
    // Reconstruct the SQL query from template strings and values
    let query = strings[0]
    for (let i = 0; i < values.length; i++) {
      query += values[i] + strings[i + 1]
    }

    console.log("[DB] Executing query:", query.substring(0, 100) + "...")

    // Parse common SQL patterns and convert to Supabase queries
    if (query.includes("SELECT COUNT(*) FROM quotes")) {
      const { count, error } = await supabase.from("quotes").select("*", { count: "exact", head: true })
      if (error) throw new Error(error.message)
      return [{ count }] as T
    }

    if (query.includes("select") && query.includes("from quotes") && query.includes("order by created_at desc")) {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          id,
          created_at,
          owner_name,
          prospect_name,
          status,
          expected_close_date,
          monthly_recurring,
          one_time_charges,
          total_price_option1,
          num_washers,
          num_dryers
        `)
        .order("created_at", { ascending: false })
        .limit(200)

      if (error) throw new Error(error.message)
      return data as T
    }

    if (query.includes("SELECT") && query.includes("FROM quotes")) {
      const { data, error } = await supabase.from("quotes").select("*")
      if (error) throw new Error(error.message)
      return data as T
    }

    // For simple table existence check
    if (query.includes("SELECT 1 FROM quotes LIMIT 1")) {
      const { data, error } = await supabase.from("quotes").select("id").limit(1)
      if (error) throw new Error(error.message)
      return data as T
    }

    // Fallback for other queries - try to execute as raw SQL if possible
    throw new Error(`Unsupported query pattern: ${query.substring(0, 50)}...`)
  }

  return sqlClient
}

async function verifyQuotes(client: SqlClient): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Simple test to check if quotes table exists and is accessible
    await client`SELECT 1 FROM quotes LIMIT 1`
    return { ok: true }
  } catch (e: any) {
    console.log(`[DB] Connection test failed:`, e?.message)
    return { ok: false, error: e?.message || "connection failed" }
  }
}

/**
 * Main entry: returns a Supabase SQL client that mimics the Neon interface
 */
export async function getSql(): Promise<SqlClient> {
  if (cached) return cached.sql

  try {
    console.log("[DB] Creating Supabase SQL client...")
    const client = createSupabaseSqlClient()

    const check = await verifyQuotes(client)
    if (check.ok) {
      console.log("[DB] Success with Supabase")
      cached = { sql: client, source: "Supabase" }
      return client
    } else {
      throw new Error(`Supabase connection failed: ${check.error}`)
    }
  } catch (e: any) {
    console.error("[DB] Failed to connect to Supabase:", e?.message)
    throw new Error(`Could not connect to Supabase database: ${e?.message}`)
  }
}

/**
 * Returns database status for admin interface
 */
export async function getDbStatuses() {
  const results: Array<{ key: string; status: "ok" | "missing" | "no-table" | "error"; message?: string }> = []

  try {
    const client = createSupabaseSqlClient()
    const check = await verifyQuotes(client)

    if (check.ok) {
      results.push({ key: "Supabase", status: "ok" })
    } else {
      results.push({ key: "Supabase", status: "no-table", message: check.error })
    }
  } catch (e: any) {
    results.push({ key: "Supabase", status: "error", message: e?.message || "connection failed" })
  }

  return results
}

/**
 * Returns the currently active source info
 */
export async function getActiveDbSource() {
  return {
    source: "Supabase",
    hasOverride: false,
  }
}
