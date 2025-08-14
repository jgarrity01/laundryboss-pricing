import { neon } from "@neondatabase/serverless"

async function createTables() {
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    console.error("❌ No DATABASE_URL or POSTGRES_URL found")
    process.exit(1)
  }

  console.log("🔗 Connecting to database...")
  const sql = neon(databaseUrl)

  try {
    // Test connection
    await sql`SELECT 1`
    console.log("✅ Database connection successful")

    // Create quotes table
    console.log("📝 Creating quotes table...")
    await sql`
      CREATE TABLE IF NOT EXISTS public.quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        
        -- Contact info
        prospect_name TEXT,
        owner_name TEXT,
        customer_email TEXT,
        distributor_name TEXT,
        
        -- Business details
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
        self_install BOOLEAN DEFAULT false,
        ai_attendant BOOLEAN DEFAULT false,
        ai_integration BOOLEAN DEFAULT false,
        
        -- Pricing
        kiosks JSONB,
        monthly_recurring NUMERIC,
        one_time_charges NUMERIC,
        monthly_total_48 NUMERIC,
        present_value NUMERIC,
        total_to_finance NUMERIC,
        financed_monthly_payment NUMERIC,
        option2_interest_rate NUMERIC,
        total_price_option1 NUMERIC,
        
        -- Distributor
        distributor BOOLEAN DEFAULT false,
        distributor_total_price NUMERIC,
        
        -- Revenue projections
        projected_uplift_monthly NUMERIC,
        additional_savings_monthly NUMERIC,
        
        -- Admin fields
        status TEXT DEFAULT 'draft',
        expected_close_date DATE,
        send_to_customer BOOLEAN DEFAULT false,
        emailed_to_customer_at TIMESTAMPTZ,
        emailed_to_team_at TIMESTAMPTZ,
        additional_notes TEXT,
        
        -- Sharing
        public_share_token TEXT,
        public_share_expires_at TIMESTAMPTZ
      )
    `

    // Create quote_revisions table
    console.log("📝 Creating quote_revisions table...")
    await sql`
      CREATE TABLE IF NOT EXISTS public.quote_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        data JSONB NOT NULL,
        note TEXT
      )
    `

    // Create indexes for better performance
    console.log("🔍 Creating indexes...")
    await sql`CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_quotes_expected_close ON public.quotes(expected_close_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_quote_revisions_quote_id ON public.quote_revisions(quote_id)`

    console.log("✅ All tables and indexes created successfully!")

    // Verify tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('quotes', 'quote_revisions')
      ORDER BY table_name
    `

    console.log("📋 Created tables:", tables.map((t) => t.table_name).join(", "))
  } catch (error) {
    console.error("❌ Error creating tables:", error)
    process.exit(1)
  }
}

createTables()
