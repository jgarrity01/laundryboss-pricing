import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { databaseUrl } = body

    // Try to get database URL from request body or environment
    const finalDatabaseUrl =
      databaseUrl || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL

    if (!finalDatabaseUrl) {
      return NextResponse.json(
        {
          error: "No database URL provided. Please enter your database URL in the form above.",
        },
        { status: 400 },
      )
    }

    // Validate URL format
    if (!finalDatabaseUrl.startsWith("postgres://") && !finalDatabaseUrl.startsWith("postgresql://")) {
      return NextResponse.json(
        {
          error: "Invalid database URL format. URL should start with 'postgres://' or 'postgresql://'",
        },
        { status: 400 },
      )
    }

    const sql = neon(finalDatabaseUrl)

    // Test connection first
    await sql`SELECT 1`

    await sql`
      CREATE TABLE IF NOT EXISTS quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        emailed_to_customer_at TIMESTAMP WITH TIME ZONE,
        emailed_to_team_at TIMESTAMP WITH TIME ZONE,
        
        -- Basic info
        prospect_name TEXT,
        owner_name TEXT,
        distributor_name TEXT,
        customer_email TEXT,
        additional_notes TEXT,
        status TEXT DEFAULT 'draft',
        
        -- Store details
        store_size INTEGER,
        num_washers INTEGER,
        num_dryers INTEGER,
        monthly_base_revenue NUMERIC,
        
        -- Services
        accepts_cash BOOLEAN DEFAULT false,
        accepts_cards BOOLEAN DEFAULT false,
        has_wdf BOOLEAN DEFAULT false,
        wants_wdf BOOLEAN DEFAULT false,
        wdf_provider TEXT,
        wants_pickup_delivery BOOLEAN DEFAULT false,
        has_payment_vendor BOOLEAN DEFAULT false,
        current_vendor TEXT,
        
        -- Installation & AI
        self_install BOOLEAN DEFAULT false,
        ai_attendant BOOLEAN DEFAULT false,
        ai_integration BOOLEAN DEFAULT false,
        
        -- Kiosks (JSON)
        kiosks JSONB DEFAULT '[]',
        
        -- Pricing
        monthly_recurring NUMERIC DEFAULT 0,
        one_time_charges NUMERIC DEFAULT 0,
        monthly_total_48 NUMERIC DEFAULT 0,
        present_value NUMERIC DEFAULT 0,
        total_to_finance NUMERIC DEFAULT 0,
        financed_monthly_payment NUMERIC DEFAULT 0,
        option2_interest_rate NUMERIC DEFAULT 0,
        total_price_option1 NUMERIC DEFAULT 0,
        
        -- Distributor
        distributor BOOLEAN DEFAULT false,
        distributor_total_price NUMERIC DEFAULT 0,
        
        -- Revenue projections
        projected_uplift_monthly NUMERIC DEFAULT 0,
        additional_savings_monthly NUMERIC DEFAULT 0,
        
        -- Sales
        expected_close_date DATE,
        send_to_customer BOOLEAN DEFAULT false,
        public_share_token TEXT,
        public_share_expires_at TIMESTAMP WITH TIME ZONE
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS quote_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        data JSONB NOT NULL,
        note TEXT
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_quotes_expected_close ON quotes(expected_close_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_quote_revisions_quote_id ON quote_revisions(quote_id)`

    return NextResponse.json({
      success: true,
      message: "Tables created successfully! You can now use the admin portal.",
    })
  } catch (error) {
    console.error("Error creating tables:", error)
    return NextResponse.json(
      {
        error: `Failed to create tables: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
