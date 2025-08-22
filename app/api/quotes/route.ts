import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { pricingData, calculateInstallationCost } from "@/lib/pricing-data"

type KioskOptions = {
  rearLoad: { selected: boolean; quantity: number }
  frontLoad: { selected: boolean; quantity: number }
  creditBill: { selected: boolean; quantity: number }
  creditOnly: { selected: boolean; quantity: number }
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration")
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: rows, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching quotes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(rows || [])
  } catch (error) {
    console.error("Error in GET /api/quotes:", error)
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      prospectName,
      ownerName,
      customerEmail, // Added email field
      // customerPhone, // Added phone field
      distributorName,
      storeSize,
      numWashers,
      numDryers,
      acceptsCash,
      acceptsCards,
      hasWashDryFold,
      wdfProvider,
      wantsWashDryFold,
      wantsPickupDelivery,
      hasPaymentVendor,
      currentVendor,
      selfInstall,
      hasAiAttendant,
      hasAiAttendantWithIntegration,
      kioskOptions,
      additionalNotes,
      monthlyRevenue,
      expectedCloseDate,
      selectedPricingOption,
      serviceBreakdown,
    }: {
      prospectName: string
      ownerName: string
      customerEmail: string // Added email type
      // customerPhone: string // Added phone type
      distributorName?: string
      storeSize: number
      numWashers: number
      numDryers: number
      acceptsCash: boolean
      acceptsCards: boolean
      hasWashDryFold: boolean
      wdfProvider?: string
      wantsWashDryFold: boolean
      wantsPickupDelivery: boolean
      hasPaymentVendor: boolean
      currentVendor?: string
      selfInstall: boolean
      hasAiAttendant: boolean
      hasAiAttendantWithIntegration: boolean
      kioskOptions: KioskOptions
      additionalNotes?: string
      monthlyRevenue?: number
      expectedCloseDate?: string
      selectedPricingOption?: string
      serviceBreakdown?: any
    } = body

    const supabase = getSupabaseAdmin()

    const isDistributor = (distributorName || "").trim() !== ""

    // Calculate pricing (mirrors client logic)
    let monthlyRecurring = 0
    let oneTimeCharges = 0

    let washerPrice = pricingData.monthlyRecurring.washers.price
    let dryerPrice = pricingData.monthlyRecurring.dryers.price
    let wdfPrice = pricingData.monthlyRecurring.wdfSoftware.price
    let pickupPrice = pricingData.monthlyRecurring.pickupDelivery.price
    let aiAttendantPrice = pricingData.monthlyRecurring.aiAttendant.price
    let aiIntegrationPrice = pricingData.monthlyRecurring.aiAttendantWithIntegration.price

    if (isDistributor) {
      washerPrice *= 0.8
      dryerPrice *= 0.8
      wdfPrice *= 0.8
      pickupPrice *= 0.8
      aiAttendantPrice *= 0.8
      aiIntegrationPrice *= 0.8
    }

    monthlyRecurring += numWashers * washerPrice
    monthlyRecurring += numDryers * dryerPrice
    if (wantsWashDryFold) monthlyRecurring += wdfPrice
    if (wantsPickupDelivery) monthlyRecurring += pickupPrice
    if (hasAiAttendantWithIntegration) {
      monthlyRecurring += aiAttendantPrice + aiIntegrationPrice
    } else if (hasAiAttendant) {
      monthlyRecurring += aiAttendantPrice
    }

    const totalMachines = numWashers + numDryers
    oneTimeCharges += totalMachines * pricingData.oneTimeCharges.harnesses.price

    const qrCodeSheets = Math.ceil(totalMachines / 20)
    oneTimeCharges += pricingData.oneTimeCharges.qrCodes.price * qrCodeSheets

    oneTimeCharges += pricingData.oneTimeCharges.signPackage.price
    oneTimeCharges += pricingData.oneTimeCharges.matterport3D.price
    const installationCost = calculateInstallationCost(totalMachines, selfInstall)
    oneTimeCharges += installationCost
    oneTimeCharges += pricingData.oneTimeCharges.fullNetworkPackage.price

    const kioskDiscount = isDistributor ? 0.7 : 1.0
    const rearQty = kioskOptions?.rearLoad?.selected ? kioskOptions.rearLoad.quantity : 0
    const frontQty = kioskOptions?.frontLoad?.selected ? kioskOptions.frontLoad.quantity : 0
    const ebtQty = kioskOptions?.creditBill?.selected ? kioskOptions.creditBill.quantity : 0
    const ccOnlyQty = kioskOptions?.creditOnly?.selected ? kioskOptions.creditOnly.quantity : 0

    oneTimeCharges += pricingData.kioskOptions.rearLoadKiosk.price * rearQty * kioskDiscount
    oneTimeCharges += pricingData.kioskOptions.frontLoadKiosk.price * frontQty * kioskDiscount
    oneTimeCharges += pricingData.kioskOptions.creditBillKiosk.price * ebtQty * kioskDiscount
    oneTimeCharges += pricingData.kioskOptions.creditOnlyKiosk.price * ccOnlyQty * kioskDiscount

    const totalPrice = monthlyRecurring * 48 + oneTimeCharges

    // Calculate financing details
    const interestRate = 9 // 9% APR
    const monthlyRate = interestRate / 100 / 12
    const months = 48

    // Present value calculation for monthly services
    const monthlyPV = monthlyRecurring * ((1 - Math.pow(1 + 0.125 / 12, -months)) / (0.125 / 12))
    const totalToFinance = monthlyPV + oneTimeCharges
    const financedMonthlyPayment =
      (totalToFinance * (monthlyRate * Math.pow(1 + monthlyRate, months))) / (Math.pow(1 + monthlyRate, months) - 1)

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        id,
        created_at: createdAt,
        expires_at: expiresAt,
        prospect_name: prospectName,
        owner_name: ownerName,
        customer_email: customerEmail, // Added email field to database insert
        // customer_phone: customerPhone, // Added phone field to database insert
        distributor_name: distributorName || null,
        store_size: storeSize,
        num_washers: numWashers,
        num_dryers: numDryers,
        accepts_cash: acceptsCash,
        accepts_cards: acceptsCards,
        has_wdf: hasWashDryFold,
        wdf_provider: wdfProvider || null,
        wants_wdf: wantsWashDryFold,
        wants_pickup_delivery: wantsPickupDelivery,
        has_payment_vendor: hasPaymentVendor,
        current_vendor: currentVendor || null,
        self_install: selfInstall,
        ai_attendant: hasAiAttendant,
        ai_integration: hasAiAttendantWithIntegration,
        kiosks: JSON.stringify(kioskOptions),
        additional_notes: additionalNotes || null,
        monthly_base_revenue: monthlyRevenue ?? null,
        expected_close_date: expectedCloseDate || null,
        monthly_recurring: monthlyRecurring,
        one_time_charges: oneTimeCharges,
        total_price_option1: totalPrice,
        distributor_total_price: isDistributor ? totalPrice * 0.8 : null,
        monthly_total_48: monthlyRecurring * 48,
        present_value: monthlyPV,
        total_to_finance: totalToFinance,
        financed_monthly_payment: financedMonthlyPayment,
        option2_interest_rate: interestRate,
        status: "New",
        additional_savings_monthly: selectedPricingOption
          ? JSON.stringify({
              selectedOption: selectedPricingOption,
              serviceBreakdown: serviceBreakdown,
              isDistributor: isDistributor,
              hasCleanShowPricing: selectedPricingOption === "Option 4: Clean Show 2025 Special Pricing",
            })
          : null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error inserting quote:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        id,
        createdAt,
        monthlyRecurring,
        oneTimeCharges,
        totalPrice,
        message: "Quote saved successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error in POST /api/quotes:", error)
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 })
  }
}
