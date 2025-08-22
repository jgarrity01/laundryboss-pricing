import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { data: quote, error } = await supabase.from("quotes").select("*").eq("id", params.id).single()

    if (error || !quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Load revisions as well
    const { data: revisions } = await supabase
      .from("quote_revisions")
      .select("id, created_at, note, data")
      .eq("quote_id", quote.id)
      .order("created_at", { ascending: false })

    return NextResponse.json({ quote, revisions: revisions || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Extract the fields that can be updated
    const {
      prospect_name,
      owner_name,
      distributor_name,
      customer_email,
      store_size,
      num_washers,
      num_dryers,
      monthly_base_revenue,
      accepts_cash,
      accepts_cards,
      has_wdf,
      wants_wdf,
      wdf_provider,
      wants_pickup_delivery,
      ai_attendant,
      ai_integration,
      self_install,
      kiosks,
      option2_interest_rate,
      status,
      expected_close_date,
      additional_notes,
      current_vendor,
      edit_note,
    } = body

    // Get the current quote for revision tracking
    const { data: currentQuote, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", params.id)
      .single()

    if (fetchError || !currentQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Update the quote
    const { data: updatedQuote, error: updateError } = await supabase
      .from("quotes")
      .update({
        prospect_name,
        owner_name,
        distributor_name,
        customer_email,
        store_size,
        num_washers,
        num_dryers,
        monthly_base_revenue,
        accepts_cash,
        accepts_cards,
        has_wdf,
        wants_wdf,
        wdf_provider,
        wants_pickup_delivery,
        ai_attendant,
        ai_integration,
        self_install,
        kiosks,
        option2_interest_rate,
        status,
        expected_close_date,
        additional_notes,
        current_vendor,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Create a revision record
    await supabase.from("quote_revisions").insert({
      quote_id: currentQuote.id,
      note: edit_note || "Quote updated via admin",
      data: currentQuote,
    })

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      message: "Quote updated successfully",
    })
  } catch (e: any) {
    console.error("Error updating quote:", e)
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Get the current quote first
    const { data: currentQuote, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", params.id)
      .single()

    if (fetchError || !currentQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Handle partial updates - build update object
    const updateData: any = {}

    if (body.option2_interest_rate !== undefined) {
      updateData.option2_interest_rate = body.option2_interest_rate
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Execute the update
    const { data: updatedQuote, error: updateError } = await supabase
      .from("quotes")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Create a revision record
    await supabase.from("quote_revisions").insert({
      quote_id: currentQuote.id,
      note: "Financing rate updated via admin",
      data: currentQuote,
    })

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      message: "Quote updated successfully",
    })
  } catch (e: any) {
    console.error("Error updating quote:", e)
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}
