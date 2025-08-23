"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Save, X, RefreshCw } from "lucide-react"
import jsPDF from "jspdf"

type QuoteDetail = {
  quote: any
  revisions: { id: string; created_at: string; note: string | null; data: any }[]
}

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<any>({})

  const fetchData = async () => {
    const supabase = getSupabaseClient()
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.replace("/admin/login")
      return
    }
    const id = params?.id as string
    const res = await fetch(`/api/admin/quotes/${id}`, { cache: "no-store" })
    if (res.ok) {
      const result = await res.json()
      setData(result)
      setEditData(result.quote)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [params, router])

  const handleEdit = () => {
    setIsEditing(true)
    setEditData({ ...data?.quote })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditData(data?.quote || {})
  }

  const handleSave = async () => {
    if (!data?.quote?.id) return

    setSaving(true)
    try {
      const updatedData = { ...editData }

      if (updatedData.option2_interest_rate !== data.quote.option2_interest_rate) {
        const monthlyPV = calculatePresentValue(updatedData.monthly_recurring || 0)
        const totalToFinance = monthlyPV + (updatedData.one_time_charges || 0)
        const newFinancedPayment = calculateLoanPayment(totalToFinance, updatedData.option2_interest_rate || 9, 48)
        updatedData.financed_monthly_payment = newFinancedPayment
      }

      const response = await fetch(`/api/admin/quotes/${data.quote.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...updatedData,
          edit_note: `Updated quote details: ${new Date().toLocaleString()}`,
        }),
      })

      if (response.ok) {
        await fetchData() // Refresh the data
        setIsEditing(false)
      } else {
        const error = await response.json()
        alert(`Failed to update quote: ${error.error}`)
      }
    } catch (error) {
      console.error("Error updating quote:", error)
      alert("Failed to update quote")
    } finally {
      setSaving(false)
    }
  }

  const generateAdminPDF = async () => {
    console.log("[v0] Admin PDF generation started for quote:", data?.quote.id)
    try {
      if (typeof jsPDF === "undefined") {
        console.error("[v0] jsPDF is not available")
        alert("PDF generation library not loaded. Please refresh the page and try again.")
        return
      }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const margin = 20
      let yPosition = 20

      const addText = (text: string, x: number, y: number, options: any = {}) => {
        const maxWidth = options.maxWidth || pageWidth - 2 * margin
        const lines = doc.splitTextToSize(text, maxWidth)
        doc.text(lines, x, y)
        return y + lines.length * (options.lineHeight || 6)
      }

      const checkNewPage = (requiredSpace = 30) => {
        if (yPosition > 280 - requiredSpace) {
          doc.addPage()
          yPosition = 20
        }
      }

      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount)
      }

      const generatePDFContent = async () => {
        // Header
        doc.setFontSize(20)
        doc.setFont(undefined, "bold")
        yPosition = addText("Laundry Boss Quote", margin, yPosition)
        yPosition += 10

        // Customer Information
        doc.setFontSize(12)
        doc.setFont(undefined, "normal")
        yPosition = addText(
          `Customer: ${data?.quote.owner_name || "N/A"} | Business: ${data?.quote.prospect_name || "N/A"}`,
          margin,
          yPosition,
        )
        yPosition = addText(
          `Email: ${data?.quote.customer_email || "N/A"} | Phone: ${data?.quote.customer_phone || "N/A"}`,
          margin,
          yPosition,
        )
        yPosition = addText(
          `Configuration: ${data?.quote.num_washers || 0} Washers, ${data?.quote.num_dryers || 0} Dryers`,
          margin,
          yPosition,
        )

        const services = []
        if (data?.quote.wants_wash_dry_fold) services.push("Wash-Dry-Fold")
        if (data?.quote.wants_pickup_delivery) services.push("Pickup & Delivery")
        if (services.length > 0) {
          yPosition = addText(`Services: ${services.join(" | ")}`, margin, yPosition)
        }
        yPosition += 15

        checkNewPage(80)

        doc.setFontSize(16)
        doc.setFont(undefined, "bold")
        yPosition = addText("REVENUE GROWTH PROJECTIONS", margin, yPosition)
        yPosition += 10

        const monthlyRevenueBaseline = Math.max(0, Number(data?.quote.monthly_base_revenue || 0))
        const weeksPerMonth = 4.33
        const upliftRate = 0.153
        const addedMonthlyRevenue = monthlyRevenueBaseline * upliftRate
        const projectedMonthlyAfterLB = monthlyRevenueBaseline + addedMonthlyRevenue
        const addedWeeklyRevenue = addedMonthlyRevenue / weeksPerMonth
        const projectedWeeklyAfterLB = projectedMonthlyAfterLB / weeksPerMonth
        const addedAnnualRevenue = addedMonthlyRevenue * 12
        const projectedAnnualAfterLB = projectedMonthlyAfterLB * 12

        doc.setFontSize(10)
        doc.setFont(undefined, "bold")

        // Table headers
        const tableStartY = yPosition
        doc.text("REVENUE COMPARISON", margin, yPosition)
        doc.text("WEEKLY", margin + 80, yPosition)
        doc.text("MONTHLY", margin + 120, yPosition)
        doc.text("ANNUAL", margin + 160, yPosition)
        yPosition += 8

        // Draw line under headers
        doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2)

        doc.setFont(undefined, "normal")
        doc.text("Current Revenue", margin, yPosition)
        doc.text(formatCurrency(monthlyRevenueBaseline / weeksPerMonth), margin + 80, yPosition)
        doc.text(formatCurrency(monthlyRevenueBaseline), margin + 120, yPosition)
        doc.text(formatCurrency(monthlyRevenueBaseline * 12), margin + 160, yPosition)
        yPosition += 6

        doc.text("Projected with Laundry Boss", margin, yPosition)
        doc.text(formatCurrency(projectedWeeklyAfterLB), margin + 80, yPosition)
        doc.text(formatCurrency(projectedMonthlyAfterLB), margin + 120, yPosition)
        doc.text(formatCurrency(projectedAnnualAfterLB), margin + 160, yPosition)
        yPosition += 6

        doc.setFont(undefined, "bold")
        doc.text("ADDITIONAL REVENUE", margin, yPosition)
        doc.text(formatCurrency(addedWeeklyRevenue), margin + 80, yPosition)
        doc.text(formatCurrency(addedMonthlyRevenue), margin + 120, yPosition)
        doc.text(formatCurrency(addedAnnualRevenue), margin + 160, yPosition)
        yPosition += 8

        // Draw line under table
        doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2)

        doc.setFont(undefined, "normal")
        yPosition = addText("Based on 15.3% average increase in first ~90 days", margin, yPosition)
        yPosition += 15

        checkNewPage(100)

        doc.setFontSize(16)
        doc.setFont(undefined, "bold")
        yPosition = addText("PRICING OPTIONS", margin, yPosition)
        yPosition += 10

        doc.setFontSize(12)
        doc.setFont(undefined, "bold")
        yPosition = addText("Option 1 - Total Price", margin, yPosition)
        doc.setFontSize(14)
        doc.setFont(undefined, "bold")
        yPosition = addText(formatCurrency(data?.quote.total_price_option1 || 0), margin + 100, yPosition - 6)
        doc.setFontSize(10)
        doc.setFont(undefined, "normal")
        yPosition = addText(
          "Pay the full amount upfront and own your Laundry Boss system immediately.",
          margin,
          yPosition,
        )
        yPosition += 8

        // Option 2: Financed Solution
        if (data?.quote.financed_monthly_payment) {
          doc.setFontSize(12)
          doc.setFont(undefined, "bold")
          yPosition = addText("Option 2 - Financed Solution", margin, yPosition)
          doc.setFontSize(14)
          doc.setFont(undefined, "bold")
          yPosition = addText(
            `${formatCurrency(data.quote.financed_monthly_payment)}/month`,
            margin + 100,
            yPosition - 6,
          )
          doc.setFontSize(10)
          doc.setFont(undefined, "normal")
          yPosition = addText("48-month financing with competitive rates.", margin, yPosition)
          yPosition += 8
        }

        // Option 3: Monthly Plan
        doc.setFontSize(12)
        doc.setFont(undefined, "bold")
        yPosition = addText("Option 3 - Monthly Plan", margin, yPosition)
        doc.setFontSize(14)
        doc.setFont(undefined, "bold")
        yPosition = addText(`${formatCurrency(data?.quote.monthly_recurring || 0)}/month`, margin + 100, yPosition - 6)
        doc.setFontSize(10)
        doc.setFont(undefined, "normal")
        yPosition = addText(`Plus ${formatCurrency(data?.quote.one_time_charges || 0)} setup fee`, margin, yPosition)
        yPosition = addText("Low monthly payments with comprehensive service package.", margin, yPosition)
        yPosition += 8

        const cleanShowMonthlyRecurring = (data?.quote.monthly_recurring || 0) * 0.8
        const cleanShowOneTimeCharges = (data?.quote.one_time_charges || 0) * 0.7
        const cleanShowTotalPrice = cleanShowMonthlyRecurring * 48 + cleanShowOneTimeCharges
        const totalSavings = (data?.quote.total_price_option1 || 0) - cleanShowTotalPrice

        doc.setFontSize(12)
        doc.setFont(undefined, "bold")
        yPosition = addText("Option 4 - Clean Show 2025 Special", margin, yPosition)
        doc.setFontSize(14)
        doc.setFont(undefined, "bold")
        yPosition = addText(formatCurrency(cleanShowTotalPrice), margin + 100, yPosition - 6)
        doc.setFontSize(10)
        doc.setFont(undefined, "normal")
        yPosition = addText("Limited-time exclusive offer - same pricing as our distributors!", margin, yPosition)
        yPosition += 5

        // Special discounts breakdown
        yPosition = addText("SPECIAL DISCOUNTS APPLIED:", margin, yPosition)
        yPosition = addText("* 20% discount on all monthly services", margin + 5, yPosition)
        yPosition = addText("* 30% discount on all kiosk options", margin + 5, yPosition)
        yPosition += 5

        yPosition = addText(
          `Monthly Recurring (Discounted): ${formatCurrency(cleanShowMonthlyRecurring)}/month`,
          margin,
          yPosition,
        )
        yPosition = addText(
          `One-Time Charges (Discounted): ${formatCurrency(cleanShowOneTimeCharges)}`,
          margin,
          yPosition,
        )
        yPosition = addText(
          `Total Contract Value (48 months): ${formatCurrency(cleanShowTotalPrice)}`,
          margin,
          yPosition,
        )

        doc.setFont(undefined, "bold")
        yPosition = addText(`YOUR TOTAL SAVINGS: ${formatCurrency(totalSavings)}`, margin, yPosition)
        doc.setFont(undefined, "normal")
        yPosition += 15

        checkNewPage(80)

        doc.setFontSize(14)
        doc.setFont(undefined, "bold")
        yPosition = addText("MONTHLY RECURRING FEES (48-month contract)", margin, yPosition)
        yPosition += 8

        const breakdown = getServiceBreakdown(data?.quote)
        doc.setFontSize(10)
        doc.setFont(undefined, "normal")

        breakdown.monthlyServices.forEach((service) => {
          doc.text(service.name, margin, yPosition)
          doc.text(formatCurrency(service.price), margin + 120, yPosition)
          yPosition += 6
        })

        doc.line(margin, yPosition, margin + 140, yPosition)
        yPosition += 4
        doc.setFont(undefined, "bold")
        doc.text("MONTHLY TOTAL", margin, yPosition)
        doc.text(formatCurrency(data?.quote.monthly_recurring || 0), margin + 120, yPosition)
        yPosition += 15

        checkNewPage(80)

        doc.setFontSize(14)
        doc.setFont(undefined, "bold")
        yPosition = addText("ONE-TIME CHARGES", margin, yPosition)
        yPosition += 8

        doc.setFontSize(10)
        doc.setFont(undefined, "normal")
        breakdown.oneTimeCharges.forEach((charge) => {
          doc.text(charge.name, margin, yPosition)
          doc.text(formatCurrency(charge.price), margin + 120, yPosition)
          yPosition += 6
        })

        doc.line(margin, yPosition, margin + 140, yPosition)
        yPosition += 4
        doc.setFont(undefined, "bold")
        doc.text("ONE-TIME TOTAL", margin, yPosition)
        doc.text(formatCurrency(data?.quote.one_time_charges || 0), margin + 120, yPosition)
        yPosition += 15

        checkNewPage(60)

        doc.setFontSize(14)
        doc.setFont(undefined, "bold")
        yPosition = addText("ADDITIONAL NOTES", margin, yPosition)
        yPosition += 8

        doc.setFontSize(10)
        doc.setFont(undefined, "normal")
        yPosition = addText("* All monthly pricing is based on a 48-month contract term", margin, yPosition)
        yPosition = addText("* Installation includes full setup and training for your team", margin, yPosition)
        yPosition = addText("* 24/7 technical support and maintenance included", margin, yPosition)
        yPosition = addText("* Revenue projections based on Laundry Boss average performance data", margin, yPosition)
        yPosition = addText("* Financing options available with approved credit", margin, yPosition)
        yPosition += 10

        doc.setFontSize(12)
        doc.setFont(undefined, "bold")
        yPosition = addText("Why Laundry Boss is a Perfect Fit:", margin, yPosition)
        yPosition += 5

        doc.setFontSize(10)
        doc.setFont(undefined, "normal")
        yPosition = addText("* Proven track record of 15.3% average revenue increase", margin, yPosition)
        yPosition = addText("* Smart monitoring reduces equipment downtime", margin, yPosition)
        yPosition = addText("* Enhanced customer experience drives repeat business", margin, yPosition)
        yPosition = addText("* Real-time analytics help optimize operations", margin, yPosition)
        yPosition += 15

        // Footer
        yPosition = addText("Generated by Laundry Boss Admin Panel", margin, yPosition)
        yPosition = addText(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition)

        const fileName = `LaundryBoss_Quote_${(data?.quote.prospect_name || "Quote").replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
        console.log("[v0] Comprehensive admin PDF generated successfully:", fileName)

        try {
          console.log("[v0] Attempting to download PDF:", fileName)
          doc.save(fileName)
          console.log("[v0] PDF download triggered successfully")

          setTimeout(() => {
            alert(
              `PDF "${fileName}" has been generated and should download automatically. Check your Downloads folder.`,
            )
          }, 500)
        } catch (downloadError) {
          console.error("[v0] Error downloading PDF:", downloadError)
          alert("PDF was generated but download failed. Please try again.")
          return
        }

        try {
          const response = await fetch("/api/quotes/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerEmail: data?.quote.customer_email,
              prospectName: data?.quote.prospect_name,
              fileName: fileName,
              quoteData: data?.quote,
            }),
          })

          if (response.ok) {
            console.log("[v0] Admin PDF reference saved to database")
          }
        } catch (error) {
          console.error("[v0] Error saving admin PDF reference:", error)
        }
      }

      try {
        const logoImg = new Image()
        logoImg.crossOrigin = "anonymous"
        logoImg.onload = async () => {
          // Add logo to PDF
          doc.addImage(logoImg, "PNG", margin, yPosition, 60, 20)
          yPosition += 30

          await generatePDFContent()
        }
        logoImg.onerror = async () => {
          console.log("[v0] Logo failed to load, continuing without logo")
          await generatePDFContent()
        }
        logoImg.src = "/images/laundry-boss-logo.png"
      } catch (error) {
        console.log("[v0] Error loading logo, continuing without logo")
        await generatePDFContent()
      }
    } catch (error) {
      console.error("[v0] Error generating admin PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    }
  }

  const handlePrint = () => {
    console.log("[v0] Admin print initiated")
    window.print()
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getPricingOptionName = (quote: any) => {
    console.log("[v0] Checking pricing option for quote:", quote.id)
    console.log("[v0] Quote additional_savings_monthly:", quote.additional_savings_monthly)
    console.log("[v0] Quote distributor:", quote.distributor)
    console.log("[v0] Quote distributor_name:", quote.distributor_name)

    try {
      if (quote.additional_savings_monthly) {
        const pricingData =
          typeof quote.additional_savings_monthly === "string"
            ? JSON.parse(quote.additional_savings_monthly)
            : quote.additional_savings_monthly

        console.log("[v0] Parsed pricing data:", pricingData)

        if (
          pricingData.hasCleanShowPricing ||
          pricingData.selectedOption?.includes("Clean Show") ||
          pricingData.selectedOption?.includes("Option 4")
        ) {
          console.log("[v0] Clean Show pricing detected!")
          return "Option 4: Clean Show 2025 Special Pricing"
        }
      }
    } catch (e) {
      console.error("Error parsing pricing data:", e)
    }

    if (quote.distributor || (quote.distributor_name && quote.distributor_name.trim() !== "")) {
      return "Distributor Pricing"
    }

    if (quote.monthly_recurring && quote.monthly_recurring > 0) {
      return "Option 3: Monthly Payment Plan"
    }

    return "Option 1: Total Price"
  }

  const hasSpecialPricing = (quote: any) => {
    if (quote.distributor || (quote.distributor_name && quote.distributor_name.trim() !== "")) return true

    try {
      if (quote.additional_savings_monthly) {
        const pricingData =
          typeof quote.additional_savings_monthly === "string"
            ? JSON.parse(quote.additional_savings_monthly)
            : quote.additional_savings_monthly

        return (
          pricingData.hasCleanShowPricing ||
          pricingData.selectedOption?.includes("Clean Show") ||
          pricingData.selectedOption?.includes("Option 4")
        )
      }
    } catch (e) {
      return false
    }

    return false
  }

  const getServiceBreakdown = (quote: any) => {
    try {
      if (quote.additional_savings_monthly) {
        const pricingData =
          typeof quote.additional_savings_monthly === "string"
            ? JSON.parse(quote.additional_savings_monthly)
            : quote.additional_savings_monthly

        if (pricingData.serviceBreakdown) {
          return pricingData.serviceBreakdown
        }
      }
    } catch (e) {
      console.error("Error parsing service breakdown:", e)
    }

    const isDistributor = !!(quote.distributor || (quote.distributor_name && quote.distributor_name.trim() !== ""))
    const hasCleanShowPricing = getPricingOptionName(quote).includes("Clean Show")
    const specialPricing = isDistributor || hasCleanShowPricing

    const breakdown = {
      monthlyServices: [],
      oneTimeCharges: [],
    }

    let washerPrice = 5.0 // Base price per washer
    let dryerPrice = 5.0 // Base price per dryer
    let wdfPrice = 100.0 // WDF Software License
    let pickupPrice = 100.0 // Pick Up & Delivery License
    let aiAttendantPrice = 50.0 // AT Attendant Service
    let aiIntegrationPrice = 100.0 // AI Integration Service

    if (specialPricing) {
      washerPrice *= 0.8
      dryerPrice *= 0.8
      wdfPrice *= 0.8
      pickupPrice *= 0.8
      aiAttendantPrice *= 0.8
      aiIntegrationPrice *= 0.8
    }

    if (quote.num_washers > 0) {
      breakdown.monthlyServices.push({
        name: `Washers (${quote.num_washers} × $${washerPrice.toFixed(2)})`,
        price: quote.num_washers * washerPrice,
      })
    }
    if (quote.num_dryers > 0) {
      breakdown.monthlyServices.push({
        name: `Dryers (${quote.num_dryers} × $${dryerPrice.toFixed(2)})`,
        price: quote.num_dryers * dryerPrice,
      })
    }
    if (quote.wants_wdf) {
      breakdown.monthlyServices.push({
        name: "WDF Software License",
        price: wdfPrice,
      })
    }
    if (quote.wants_pickup_delivery) {
      breakdown.monthlyServices.push({
        name: "Pick Up & Delivery License",
        price: pickupPrice,
      })
    }
    if (quote.ai_attendant && !quote.ai_integration) {
      breakdown.monthlyServices.push({
        name: "AT Attendant Service",
        price: aiAttendantPrice,
      })
    }
    if (quote.ai_integration) {
      breakdown.monthlyServices.push({
        name: "AT Attendant Service",
        price: aiAttendantPrice,
      })
      breakdown.monthlyServices.push({
        name: "AI Integration Service",
        price: aiIntegrationPrice,
      })
    }

    const totalMachines = (quote.num_washers || 0) + (quote.num_dryers || 0)

    breakdown.oneTimeCharges.push({
      name: `Harnesses (${totalMachines} × $25.00)`,
      price: totalMachines * 25.0,
    })

    const qrSheets = Math.ceil(totalMachines / 20)
    breakdown.oneTimeCharges.push({
      name: `QR Codes (${qrSheets} × $110.00)`,
      price: qrSheets * 110.0,
    })

    breakdown.oneTimeCharges.push({
      name: "Sign Package",
      price: 140.0,
    })

    breakdown.oneTimeCharges.push({
      name: "Matterport 3D Scan",
      price: 350.0,
    })

    let installationCost = 0
    if (!quote.self_install) {
      if (totalMachines <= 10) {
        installationCost = 1500
      } else if (totalMachines <= 20) {
        installationCost = 2500
      } else {
        installationCost = totalMachines * 125 // $125 per machine for large installations
      }
      breakdown.oneTimeCharges.push({
        name: `Laundry Boss Installation`,
        price: installationCost,
      })
    }

    breakdown.oneTimeCharges.push({
      name: "FULL Network Package",
      price: 1875.0,
    })

    if (quote.wants_wdf || quote.wants_pickup_delivery) {
      breakdown.oneTimeCharges.push({
        name: "Laundry Boss Point of Sale System",
        price: 3125.0,
      })
    }

    if (quote.kiosks) {
      try {
        const kiosks = typeof quote.kiosks === "string" ? JSON.parse(quote.kiosks) : quote.kiosks
        const kioskDiscount = specialPricing ? 0.7 : 1.0

        if (kiosks.rearLoad?.selected && kiosks.rearLoad.quantity > 0) {
          breakdown.oneTimeCharges.push({
            name: `Rear Load Kiosks (${kiosks.rearLoad.quantity}×)`,
            price: 6250 * kiosks.rearLoad.quantity * kioskDiscount,
          })
        }
        if (kiosks.frontLoad?.selected && kiosks.frontLoad.quantity > 0) {
          breakdown.oneTimeCharges.push({
            name: `Front Load Kiosks (${kiosks.frontLoad.quantity}×)`,
            price: 6250 * kiosks.frontLoad.quantity * kioskDiscount,
          })
        }
        if (kiosks.creditBill?.selected && kiosks.creditBill.quantity > 0) {
          breakdown.oneTimeCharges.push({
            name: `Credit/Bill Kiosks (${kiosks.creditBill.quantity}×)`,
            price: 6250 * kiosks.creditBill.quantity * kioskDiscount,
          })
        }
        if (kiosks.creditOnly?.selected && kiosks.creditOnly.quantity > 0) {
          breakdown.oneTimeCharges.push({
            name: `Credit Only Kiosks (${kiosks.creditOnly.quantity}×)`,
            price: 6250 * kiosks.creditOnly.quantity * kioskDiscount,
          })
        }
      } catch (e) {
        console.error("Error parsing kiosks:", e)
      }
    }

    return breakdown
  }

  const calculatePresentValue = (monthlyPayment: number, months = 48, discountRate = 0.125) => {
    const monthlyRate = discountRate / 12
    const pv = monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate)
    return pv
  }

  const calculateLoanPayment = (principal: number, annualRate: number, months = 48) => {
    const monthlyRate = annualRate / 100 / 12
    const payment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) / (Math.pow(1 + monthlyRate, months) - 1)
    return payment
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!data) return <div className="p-6">Not found</div>

  const q = data.quote
  const specialPricing = hasSpecialPricing(q)

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-center mb-6">
        <img src="/images/laundry-boss-logo.png" alt="The Laundry Boss" className="h-16 w-auto" />
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Quote Detail</h1>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              {console.log("[v0] Rendering admin buttons - isEditing:", isEditing)}
              <Button
                variant="outline"
                onClick={() => {
                  console.log("[v0] Admin print button clicked")
                  handlePrint()
                }}
                className="bg-blue-500 text-white border-blue-500 hover:bg-blue-600 font-semibold px-4 py-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Quote
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  console.log("[v0] Admin PDF button clicked")
                  generateAdminPDF()
                }}
                className="bg-green-500 text-white border-green-500 hover:bg-green-600 font-semibold px-4 py-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Generate PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleEdit}
                className="bg-orange-500 text-white border-orange-500 hover:bg-orange-600 font-semibold px-4 py-2"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Quote
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="bg-gray-500 text-white border-gray-500 hover:bg-gray-600 font-semibold px-4 py-2"
              >
                Back
              </Button>
            </>
          ) : (
            <>
              {console.log("[v0] Rendering edit mode buttons - isEditing:", isEditing)}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Quote Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prospect_name">Business Name</Label>
                <Input
                  id="prospect_name"
                  value={editData.prospect_name || ""}
                  onChange={(e) => setEditData({ ...editData, prospect_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner Name</Label>
                <Input
                  id="owner_name"
                  value={editData.owner_name || ""}
                  onChange={(e) => setEditData({ ...editData, owner_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distributor_name">Distributor Name</Label>
                <Input
                  id="distributor_name"
                  value={editData.distributor_name || ""}
                  onChange={(e) => setEditData({ ...editData, distributor_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={editData.customer_email || ""}
                  onChange={(e) => setEditData({ ...editData, customer_email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store_size">Store Size (sq ft)</Label>
                <Input
                  id="store_size"
                  type="number"
                  value={editData.store_size || ""}
                  onChange={(e) => setEditData({ ...editData, store_size: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="num_washers">Number of Washers</Label>
                <Input
                  id="num_washers"
                  type="number"
                  value={editData.num_washers || ""}
                  onChange={(e) => setEditData({ ...editData, num_washers: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="num_dryers">Number of Dryers</Label>
                <Input
                  id="num_dryers"
                  type="number"
                  value={editData.num_dryers || ""}
                  onChange={(e) => setEditData({ ...editData, num_dryers: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_base_revenue">Monthly Revenue</Label>
                <Input
                  id="monthly_base_revenue"
                  type="number"
                  value={editData.monthly_base_revenue || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, monthly_base_revenue: Number.parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="option2_interest_rate">Finance Interest Rate (%)</Label>
                <Input
                  id="option2_interest_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={editData.option2_interest_rate || 9}
                  onChange={(e) => {
                    const newRate = Number.parseFloat(e.target.value) || 9
                    setEditData({ ...editData, option2_interest_rate: newRate })
                  }}
                />
                <p className="text-xs text-gray-500">
                  Current: {editData.option2_interest_rate || 9}% - Payment will recalculate on save
                </p>
              </div>
            </div>

            {/* ... existing form fields ... */}
            <div className="space-y-4">
              <Label>Payment Methods</Label>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="accepts_cash"
                    checked={editData.accepts_cash || false}
                    onCheckedChange={(checked) => setEditData({ ...editData, accepts_cash: checked })}
                  />
                  <Label htmlFor="accepts_cash">Accepts Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="accepts_cards"
                    checked={editData.accepts_cards || false}
                    onCheckedChange={(checked) => setEditData({ ...editData, accepts_cards: checked })}
                  />
                  <Label htmlFor="accepts_cards">Accepts Cards</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Services</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_wdf"
                    checked={editData.has_wdf || false}
                    onCheckedChange={(checked) => setEditData({ ...editData, has_wdf: checked })}
                  />
                  <Label htmlFor="has_wdf">Has Current WDF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wants_wdf"
                    checked={editData.wants_wdf || false}
                    onCheckedChange={(checked) => setEditData({ ...editData, wants_wdf: checked })}
                  />
                  <Label htmlFor="wants_wdf">Wants LB WDF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wants_pickup_delivery"
                    checked={editData.wants_pickup_delivery || false}
                    onCheckedChange={(checked) => setEditData({ ...editData, wants_pickup_delivery: checked })}
                  />
                  <Label htmlFor="wants_pickup_delivery">Wants Pickup & Delivery</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="self_install"
                    checked={editData.self_install || false}
                    onCheckedChange={(checked) => setEditData({ ...editData, self_install: checked })}
                  />
                  <Label htmlFor="self_install">Self Install</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>AI Services</Label>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai_attendant"
                    checked={editData.ai_attendant || false}
                    onCheckedChange={(checked) => setEditData({ ...editData, ai_attendant: checked })}
                  />
                  <Label htmlFor="ai_attendant">AI Attendant</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai_integration"
                    checked={editData.ai_integration || false}
                    onCheckedChange={(checked) => setEditData({ ...editData, ai_integration: checked })}
                  />
                  <Label htmlFor="ai_integration">AI Integration</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editData.status || ""}
                  onValueChange={(value) => setEditData({ ...editData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="closed_won">Closed Won</SelectItem>
                    <SelectItem value="closed_lost">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_close_date">Expected Close Date</Label>
                <Input
                  id="expected_close_date"
                  type="date"
                  value={editData.expected_close_date || ""}
                  onChange={(e) => setEditData({ ...editData, expected_close_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_notes">Additional Notes</Label>
              <Textarea
                id="additional_notes"
                value={editData.additional_notes || ""}
                onChange={(e) => setEditData({ ...editData, additional_notes: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">Your Laundry Boss Quote</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Customer:</strong> {q.owner_name || "—"} | <strong>Business:</strong> {q.prospect_name || "—"}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Configuration:</strong> {q.num_washers || 0} Washers, {q.num_dryers || 0} Dryers
                {q.wants_wdf && " | Wash-Dry-Fold"}
                {q.wants_pickup_delivery && " | Pickup & Delivery"}
              </p>
            </div>
          </div>

          {/* Revenue Growth Projections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">Revenue Growth Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-center font-semibold text-blue-800 mb-2">Current Revenue</h4>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(q.monthly_base_revenue || 0)}</p>
                  <p className="text-sm text-blue-600">per month</p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h4 className="text-center font-semibold text-green-800 mb-2">Projected - Laundry Boss</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency((q.monthly_base_revenue || 0) * 1.153)}
                  </p>
                  <p className="text-sm text-green-600">per month</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <h4 className="text-center font-semibold text-purple-800 mb-2">Additional Revenue</h4>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency((q.monthly_base_revenue || 0) * 0.153)}
                  </p>
                  <p className="text-sm text-purple-600">per month</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <h4 className="text-center font-semibold text-orange-800 mb-2">Operational Savings</h4>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(((5500 / 30) * ((q.num_washers || 0) + (q.num_dryers || 0))) / 12)}
                  </p>
                  <p className="text-sm text-orange-600">per month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Impact Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">Revenue Impact Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const monthlyRevenueBaseline = Math.max(0, Number(q.monthly_base_revenue || 0))
                const upliftRate = 0.153 // 15.3% LB average increase
                const addedMonthlyRevenue = monthlyRevenueBaseline * upliftRate
                const projectedMonthlyAfterLB = monthlyRevenueBaseline + addedMonthlyRevenue
                const weeksPerMonth = 4.33
                const projectedWeeklyAfterLB = projectedMonthlyAfterLB / weeksPerMonth
                const projectedAnnualAfterLB = projectedMonthlyAfterLB * 12

                return (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-2">Owner-Reported Monthly Revenue</div>
                      <div className="text-2xl font-bold mb-4">
                        {monthlyRevenueBaseline > 0 ? formatCurrency(monthlyRevenueBaseline) : "Not provided"}
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border">
                      <div className="grid grid-cols-3 bg-muted text-sm font-medium">
                        <div className="px-4 py-3 text-left">Timeframe</div>
                        <div className="px-4 py-3 text-center">Before LB</div>
                        <div className="px-4 py-3 text-center">After LB</div>
                      </div>
                      <div className="divide-y">
                        <div className="grid grid-cols-3 text-sm">
                          <div className="px-4 py-3">Weekly</div>
                          <div className="px-4 py-3 text-center">
                            {formatCurrency((monthlyRevenueBaseline || 0) / weeksPerMonth)}
                          </div>
                          <div className="px-4 py-3 text-center">{formatCurrency(projectedWeeklyAfterLB || 0)}</div>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <div className="px-4 py-3">Monthly</div>
                          <div className="px-4 py-3 text-center">{formatCurrency(monthlyRevenueBaseline || 0)}</div>
                          <div className="px-4 py-3 text-center">{formatCurrency(projectedMonthlyAfterLB || 0)}</div>
                        </div>
                        <div className="grid grid-cols-3 text-sm bg-cyan-50 font-semibold">
                          <div className="px-4 py-3">Annual Revenue After LB</div>
                          <div className="px-4 py-3 text-center">—</div>
                          <div className="px-4 py-3 text-center">{formatCurrency(projectedAnnualAfterLB || 0)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Why Laundry Boss is a Perfect Fit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">Why Laundry Boss is a Perfect Fit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-green-50 rounded-lg">
                <ul className="text-sm text-green-700 space-y-2 text-center">
                  <li>• Proven track record of 15.3% average revenue increase</li>
                  <li>• Smart monitoring reduces equipment downtime</li>
                  <li>• Enhanced customer experience drives repeat business</li>
                  <li>• Real-time analytics help optimize operations</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">Pricing Options</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {q.financed_monthly_payment && (
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-semibold">Option 1: Financed Solution</h4>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(q.financed_monthly_payment)}</p>
                      <p className="text-sm text-muted-foreground">per month for 48 months</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Finance your Laundry Boss system with competitive rates.
                  </p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                      Show Details
                    </summary>

                    <div className="mt-3 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded">
                          <h5 className="font-semibold mb-2">Monthly Recurring Fees (48-month contract)</h5>
                          <div className="text-sm space-y-1">
                            <div>
                              Washers ({q.num_washers} × $49.00): {formatCurrency((q.num_washers || 0) * 49)}
                            </div>
                            <div>
                              Dryers ({q.num_dryers} × $39.00): {formatCurrency((q.num_dryers || 0) * 39)}
                            </div>
                            {q.wants_wash_dry_fold && <div>WDF Software License: $199.00</div>}
                            {q.wants_pickup_delivery && <div>Pick Up & Delivery License: $299.00</div>}
                            {q.has_ai_attendant && <div>AI Attendant Service: $199.00</div>}
                            {q.has_ai_attendant_with_integration && <div>AI Integration Service: $399.00</div>}
                            <div className="font-semibold border-t pt-1">
                              Monthly Total: {formatCurrency(q.monthly_recurring)}
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded">
                          <h5 className="font-semibold mb-2">One-Time Charges</h5>
                          <div className="text-sm space-y-1">
                            <div>
                              Harnesses ({(q.num_washers || 0) + (q.num_dryers || 0)} × $25.00):{" "}
                              {formatCurrency(((q.num_washers || 0) + (q.num_dryers || 0)) * 25)}
                            </div>
                            <div>QR Codes: $150.00</div>
                            <div>Sign Package: $499.00</div>
                            <div>Matterport 3D Scan: $299.00</div>
                            <div>FULL Network Package: $1,999.00</div>
                            <div>Laundry Boss Point of Sale System: $1,999.00</div>
                            <div>Laundry Boss Installation: {formatCurrency(q.self_install ? 999 : 1999)}</div>
                            <div className="font-semibold border-t pt-1">
                              One-Time Total: {formatCurrency(q.one_time_charges)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount Financed:</span>
                          <span className="ml-2 font-medium">{formatCurrency(q.total_to_finance || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Interest Rate:</span>
                          <span className="ml-2 font-medium">{q.option2_interest_rate || 9}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total of Payments:</span>
                          <span className="ml-2 font-medium">
                            {formatCurrency((q.financed_monthly_payment || 0) * 48)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Interest:</span>
                          <span className="ml-2 font-medium">
                            {formatCurrency((q.financed_monthly_payment || 0) * 48 - (q.total_to_finance || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              )}

              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold">Option 2: BOSS HybridPay</h4>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(q.monthly_recurring)}</p>
                    <p className="text-sm text-muted-foreground">per month + one-time setup</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Low monthly payments with comprehensive service package.
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                    Show Details
                  </summary>

                  <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-semibold mb-2">Monthly Recurring Fees (48-month contract)</h5>
                        <div className="text-sm space-y-1">
                          <div>
                            Washers ({q.num_washers} × $49.00): {formatCurrency((q.num_washers || 0) * 49)}
                          </div>
                          <div>
                            Dryers ({q.num_dryers} × $39.00): {formatCurrency((q.num_dryers || 0) * 39)}
                          </div>
                          {q.wants_wash_dry_fold && <div>WDF Software License: $199.00</div>}
                          {q.wants_pickup_delivery && <div>Pick Up & Delivery License: $299.00</div>}
                          {q.has_ai_attendant && <div>AI Attendant Service: $199.00</div>}
                          {q.has_ai_attendant_with_integration && <div>AI Integration Service: $399.00</div>}
                          <div className="font-semibold border-t pt-1">
                            Monthly Total: {formatCurrency(q.monthly_recurring)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-semibold mb-2">One-Time Charges</h5>
                        <div className="text-sm space-y-1">
                          <div>
                            Harnesses ({(q.num_washers || 0) + (q.num_dryers || 0)} × $25.00):{" "}
                            {formatCurrency(((q.num_washers || 0) + (q.num_dryers || 0)) * 25)}
                          </div>
                          <div>QR Codes: $150.00</div>
                          <div>Sign Package: $499.00</div>
                          <div>Matterport 3D Scan: $299.00</div>
                          <div>FULL Network Package: $1,999.00</div>
                          <div>Laundry Boss Point of Sale System: $1,999.00</div>
                          <div>Laundry Boss Installation: {formatCurrency(q.self_install ? 999 : 1999)}</div>
                          <div className="font-semibold border-t pt-1">
                            One-Time Total: {formatCurrency(q.one_time_charges)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Monthly Recurring:</span>
                        <span className="ml-2 font-medium">{formatCurrency(q.monthly_recurring)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">One-Time Setup:</span>
                        <span className="ml-2 font-medium">{formatCurrency(q.one_time_charges)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total First Month:</span>
                        <span className="ml-2 font-medium">
                          {formatCurrency((q.monthly_recurring || 0) + (q.one_time_charges || 0))}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">48-Month Total:</span>
                        <span className="ml-2 font-medium">
                          {formatCurrency((q.monthly_recurring || 0) * 48 + (q.one_time_charges || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </details>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold">Option 3: Total Price</h4>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(q.total_price_option1)}</p>
                    <p className="text-sm text-muted-foreground">One-time payment</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Pay the full amount upfront and own your Laundry Boss system immediately.
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                    Show Details
                  </summary>

                  <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-semibold mb-2">Monthly Recurring Fees (48-month contract)</h5>
                        <div className="text-sm space-y-1">
                          <div>
                            Washers ({q.num_washers} × $49.00): {formatCurrency((q.num_washers || 0) * 49)}
                          </div>
                          <div>
                            Dryers ({q.num_dryers} × $39.00): {formatCurrency((q.num_dryers || 0) * 39)}
                          </div>
                          {q.wants_wash_dry_fold && <div>WDF Software License: $199.00</div>}
                          {q.wants_pickup_delivery && <div>Pick Up & Delivery License: $299.00</div>}
                          {q.has_ai_attendant && <div>AI Attendant Service: $199.00</div>}
                          {q.has_ai_attendant_with_integration && <div>AI Integration Service: $399.00</div>}
                          <div className="font-semibold border-t pt-1">
                            Monthly Total: {formatCurrency(q.monthly_recurring)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-semibold mb-2">One-Time Charges</h5>
                        <div className="text-sm space-y-1">
                          <div>
                            Harnesses ({(q.num_washers || 0) + (q.num_dryers || 0)} × $25.00):{" "}
                            {formatCurrency(((q.num_washers || 0) + (q.num_dryers || 0)) * 25)}
                          </div>
                          <div>QR Codes: $150.00</div>
                          <div>Sign Package: $499.00</div>
                          <div>Matterport 3D Scan: $299.00</div>
                          <div>FULL Network Package: $1,999.00</div>
                          <div>Laundry Boss Point of Sale System: $1,999.00</div>
                          <div>Laundry Boss Installation: {formatCurrency(q.self_install ? 999 : 1999)}</div>
                          <div className="font-semibold border-t pt-1">
                            One-Time Total: {formatCurrency(q.one_time_charges)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground">Total Investment:</span>
                          <span className="ml-2 font-medium">{formatCurrency(q.total_price_option1)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ownership:</span>
                          <span className="ml-2 font-medium">Immediate</span>
                        </div>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        No monthly payments, no interest charges - you own the system outright.
                      </p>
                    </div>
                  </div>
                </details>
              </div>

              <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold text-purple-800">Option 4: Clean Show 2025 Special</h4>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(
                        q.clean_show_total_price ||
                          (q.monthly_recurring || 0) * 0.8 * 48 + (q.one_time_charges || 0) * 0.7,
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Limited-time offer</p>
                  </div>
                </div>
                <p className="text-sm text-purple-600 mb-3">
                  Same exclusive pricing as our distributors - 20% off monthly services, 30% off kiosks!
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-800">
                    Show Details
                  </summary>

                  <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-purple-50 p-3 rounded">
                        <h5 className="font-semibold mb-2 text-purple-800">Monthly Recurring Fees (Discounted 20%)</h5>
                        <div className="text-sm space-y-1">
                          <div>
                            Washers ({q.num_washers} × $39.20): {formatCurrency((q.num_washers || 0) * 39.2)}
                          </div>
                          <div>
                            Dryers ({q.num_dryers} × $31.20): {formatCurrency((q.num_dryers || 0) * 31.2)}
                          </div>
                          {q.wants_wash_dry_fold && <div>WDF Software License: $159.20</div>}
                          {q.wants_pickup_delivery && <div>Pick Up & Delivery License: $239.20</div>}
                          {q.has_ai_attendant && <div>AI Attendant Service: $159.20</div>}
                          {q.has_ai_attendant_with_integration && <div>AI Integration Service: $319.20</div>}
                          <div className="font-semibold border-t pt-1">
                            Monthly Total (Discounted): {formatCurrency((q.monthly_recurring || 0) * 0.8)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-50 p-3 rounded">
                        <h5 className="font-semibold mb-2 text-purple-800">One-Time Charges (Discounted 30%)</h5>
                        <div className="text-sm space-y-1">
                          <div>
                            Harnesses ({(q.num_washers || 0) + (q.num_dryers || 0)} × $17.50):{" "}
                            {formatCurrency(((q.num_washers || 0) + (q.num_dryers || 0)) * 17.5)}
                          </div>
                          <div>QR Codes: $105.00</div>
                          <div>Sign Package: $349.30</div>
                          <div>Matterport 3D Scan: $209.30</div>
                          <div>FULL Network Package: $1,399.30</div>
                          <div>Laundry Boss Point of Sale System: $1,399.30</div>
                          <div>Laundry Boss Installation: {formatCurrency((q.self_install ? 999 : 1999) * 0.7)}</div>
                          <div className="font-semibold border-t pt-1">
                            One-Time Total (Discounted): {formatCurrency((q.one_time_charges || 0) * 0.7)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Monthly (Discounted):</span>
                        <span className="ml-2 font-medium">{formatCurrency((q.monthly_recurring || 0) * 0.8)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">One-Time (Discounted):</span>
                        <span className="ml-2 font-medium">{formatCurrency((q.one_time_charges || 0) * 0.7)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Total Savings:</span>
                        <span className="ml-2 font-bold text-purple-600">
                          {formatCurrency(
                            (q.monthly_recurring || 0) * 48 +
                              (q.one_time_charges || 0) -
                              ((q.monthly_recurring || 0) * 0.8 * 48 + (q.one_time_charges || 0) * 0.7),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </CardContent>
          </Card>

          {/* ... existing overview and financial details cards ... */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-sm">{q.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{q.created_at ? new Date(q.created_at).toLocaleString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prospect:</span>
                  <span className="font-medium">{q.prospect_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner:</span>
                  <span>{q.owner_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{q.customer_email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize">{q.status || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Close:</span>
                  <span>{q.expected_close_date ? new Date(q.expected_close_date).toLocaleDateString() : "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Option:</span>
                  <span className="font-medium">{getPricingOptionName(q)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Revenue:</span>
                  <span className="font-medium">{formatCurrency(q.monthly_base_revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MRR:</span>
                  <span className="font-medium">{formatCurrency(q.monthly_recurring)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">One-time:</span>
                  <span className="font-medium">{formatCurrency(q.one_time_charges)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Price:</span>
                  <span className="font-bold text-lg">{formatCurrency(q.total_price_option1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Finance Rate:</span>
                  <span>{q.option2_interest_rate || 9}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Machines:</span>
                  <span>
                    {(q.num_washers ?? 0) + (q.num_dryers ?? 0)} ({q.num_washers ?? 0}W + {q.num_dryers ?? 0}D)
                  </span>
                </div>
                {q.financed_monthly_payment && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Financed Payment:</span>
                    <span className="font-medium">{formatCurrency(q.financed_monthly_payment)}/mo</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* ... existing revisions section ... */}
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Revisions</h2>
        <div className="text-sm border rounded-md divide-y">
          {data.revisions.length ? (
            data.revisions.map((r) => (
              <div key={r.id} className="p-3">
                <div className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()} {r.note ? `• ${r.note}` : ""}
                </div>
                <pre className="mt-2 overflow-auto max-h-64 bg-muted/30 p-2 rounded text-xs">
                  {JSON.stringify(r.data, null, 2)}
                </pre>
              </div>
            ))
          ) : (
            <div className="p-3 text-muted-foreground">No revisions.</div>
          )}
        </div>
      </section>
    </main>
  )
}
