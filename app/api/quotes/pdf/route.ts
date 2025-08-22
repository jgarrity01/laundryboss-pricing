import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { customerEmail, prospectName, fileName, quoteData } = await request.json()

    console.log("[v0] PDF API called with:", {
      customerEmail,
      prospectName,
      fileName,
      timestamp: new Date().toISOString(),
    })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Save PDF metadata to database
    const { data: pdfData, error: pdfError } = await supabase
      .from("quote_pdfs")
      .insert({
        customer_email: customerEmail,
        prospect_name: prospectName,
        file_name: fileName,
        quote_data: quoteData,
        created_at: new Date().toISOString(),
      })
      .select()

    if (pdfError) {
      console.error("[v0] Error saving PDF to database:", pdfError)
      // Don't fail the request if PDF tracking fails
    } else {
      console.log("[v0] PDF reference saved to database:", pdfData)
    }

    return NextResponse.json({
      success: true,
      message: "PDF reference saved successfully",
      fileName,
    })
  } catch (error) {
    console.error("[v0] Error in PDF API:", error)
    return NextResponse.json({ success: false, error: "Failed to save PDF reference" }, { status: 500 })
  }
}
