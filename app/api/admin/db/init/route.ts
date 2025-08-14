import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create required tables if they don't exist (quotes and quote_revisions)
export async function POST() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: existingQuotes, error: quotesError } = await supabase.from("quotes").select("id").limit(1)

    if (!quotesError) {
      // Table already exists and is accessible
      return NextResponse.json({ ok: true, message: "Tables already exist and are accessible" })
    }

    const { error: createError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.quotes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          emailed_to_customer_at timestamptz,
          public_share_expires_at timestamptz,
          expected_close_date date,
          emailed_to_team_at timestamptz,
          expires_at timestamptz,

          monthly_base_revenue numeric,
          projected_uplift_monthly numeric,
          additional_savings_monthly numeric,

          store_size integer,
          num_washers integer,
          num_dryers integer,

          accepts_cash boolean,
          accepts_cards boolean,
          has_wdf boolean,
          wants_wdf boolean,
          wants_pickup_delivery boolean,
          has_payment_vendor boolean,
          self_install boolean,
          ai_attendant boolean,
          ai_integration boolean,

          kiosks jsonb,
          monthly_recurring numeric,
          one_time_charges numeric,
          monthly_total_48 numeric,
          present_value numeric,
          total_to_finance numeric,
          financed_monthly_payment numeric,
          option2_interest_rate numeric,
          total_price_option1 numeric,

          distributor boolean,
          distributor_total_price numeric,

          send_to_customer boolean,

          prospect_name text,
          owner_name text,
          distributor_name text,
          customer_email text,
          additional_notes text,
          current_vendor text,
          status text,
          public_share_token text,
          wdf_provider text
        );

        CREATE TABLE IF NOT EXISTS public.quote_revisions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamptz DEFAULT now(),
          quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
          data jsonb,
          note text
        );
      `,
    })

    if (createError) {
      return NextResponse.json({ ok: false, error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: "Tables created successfully" })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to initialize tables" }, { status: 500 })
  }
}
