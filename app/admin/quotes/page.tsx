"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, ChevronUp, ChevronDown, Info, Trash2, RefreshCw, CreditCard, BarChart3 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { Separator } from "@/components/ui/separator"

type Quote = {
  id: string
  created_at: string
  prospect_name: string | null
  owner_name: string | null
  distributor_name: string | null
  customer_email: string | null
  store_size: number | null
  num_washers: number | null
  num_dryers: number | null
  monthly_base_revenue: number | null
  accepts_cash: boolean | null
  accepts_cards: boolean | null
  has_wdf: boolean | null
  wants_wdf: boolean | null
  wdf_provider: string | null
  wants_pickup_delivery: boolean | null
  ai_attendant: boolean | null
  ai_integration: boolean | null
  self_install: boolean | null
  kiosks: any
  monthly_recurring: number | null
  one_time_charges: number | null
  monthly_total_48: number | null
  present_value: number | null
  total_to_finance: number | null
  financed_monthly_payment: number | null
  option2_interest_rate: number | null
  total_price_option1: number | null
  distributor_total_price: number | null
  status: string | null
  expected_close_date: string | null
  additional_notes: string | null
  current_vendor: string | null
}

function QuoteDisplay({ quote, onDelete }: { quote: Quote; onDelete: (id: string) => void }) {
  const [showFinanceDetails, setShowFinanceDetails] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const isDistributor = quote.distributor_name && quote.distributor_name.trim() !== ""
  const totalMachines = (quote.num_washers || 0) + (quote.num_dryers || 0)

  // Revenue calculations
  const upliftRate = 0.153
  const monthlyRevenueBaseline = Math.max(0, Number(quote.monthly_base_revenue || 0))
  const addedMonthlyRevenue = monthlyRevenueBaseline * upliftRate
  const projectedMonthlyAfterLB = monthlyRevenueBaseline + addedMonthlyRevenue

  const weeksPerMonth = 4.33
  const addedWeeklyRevenue = addedMonthlyRevenue / weeksPerMonth
  const addedAnnualRevenue = addedMonthlyRevenue * 12

  const projectedWeeklyAfterLB = projectedMonthlyAfterLB / weeksPerMonth
  const projectedAnnualAfterLB = projectedMonthlyAfterLB * 12

  // Operational savings
  const perMachineAnnualSavings = 5500 / 30
  const annualOperationalSavings = perMachineAnnualSavings * totalMachines
  const monthlyOperationalSavings = annualOperationalSavings / 12
  const weeklyOperationalSavings = annualOperationalSavings / 52

  const getSelectedKiosks = () => {
    if (!quote.kiosks) return "None"
    const kiosks = []
    const kioskData = typeof quote.kiosks === "string" ? JSON.parse(quote.kiosks) : quote.kiosks

    if (kioskData.rearLoad?.selected) {
      kiosks.push(`${kioskData.rearLoad.quantity} Rear Load`)
    }
    if (kioskData.frontLoad?.selected) {
      kiosks.push(`${kioskData.frontLoad.quantity} Front Load`)
    }
    if (kioskData.creditBill?.selected) {
      kiosks.push(`${kioskData.creditBill.quantity} EBT`)
    }
    if (kioskData.creditOnly?.selected) {
      kiosks.push(`${kioskData.creditOnly.quantity} Credit Card Only`)
    }
    return kiosks.length > 0 ? kiosks.join(", ") : "None"
  }

  const calculateQRCodeInfo = (machines: number) => {
    const sheets = Math.ceil(machines / 20)
    return { sheets, totalCost: sheets * 110 }
  }

  const qrCodeInfo = calculateQRCodeInfo(totalMachines)

  // Financing calculation functions
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

  // Financing calculations for Option 2 details
  const monthlyTotal48 = (quote.monthly_recurring || 0) * 48
  const monthlyPV = calculatePresentValue(quote.monthly_recurring || 0)
  const totalToFinance = monthlyPV + (quote.one_time_charges || 0)
  const interestRate = quote.option2_interest_rate || 9
  const totalOfPayments = (quote.financed_monthly_payment || 0) * 48
  const totalInterest = totalOfPayments - totalToFinance

  const posSystemFee = quote.wants_wdf || quote.wants_pickup_delivery ? 3125 : 0

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this quote? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { error } = await supabase.from("quotes").delete().eq("id", quote.id)

      if (error) {
        alert("Failed to delete quote: " + error.message)
      } else {
        onDelete(quote.id)
      }
    } catch (err) {
      alert("Failed to delete quote")
      console.error("Error deleting quote:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">
              {quote.prospect_name || "Unnamed Prospect"} - {new Date(quote.created_at).toLocaleDateString()}
            </CardTitle>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Quote ID: {quote.id} • Status: {quote.status || "Unknown"}
              </p>
              <p className="text-sm font-semibold text-gray-700">Total: {formatCurrency(quote.total_price_option1)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
            >
              {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Revenue Impact Overview */}
          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
            <CardHeader className="text-center">
              <CardTitle className="text-cyan-700 text-2xl font-bold">Revenue Impact Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-sm text-gray-600">Owner-Reported Monthly Revenue</div>
                <div className="text-2xl font-bold">
                  {monthlyRevenueBaseline > 0 ? formatCurrency(monthlyRevenueBaseline) : "Not provided"}
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-3 bg-gray-50 text-sm font-medium">
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
                  <div className="grid grid-cols-3 text-sm">
                    <div className="px-4 py-3">Annual</div>
                    <div className="px-4 py-3 text-center">{formatCurrency((monthlyRevenueBaseline || 0) * 12)}</div>
                    <div className="px-4 py-3 text-center">{formatCurrency(projectedAnnualAfterLB || 0)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 bg-cyan-50 text-sm font-semibold">
                  <div className="px-4 py-3">Added Revenue</div>
                  <div className="px-4 py-3 text-center">—</div>
                  <div className="px-4 py-3 text-center">Annual {formatCurrency(addedAnnualRevenue || 0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-700 text-base">Additional Operational Savings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Weekly</span>
                      <span className="font-semibold">{formatCurrency(weeklyOperationalSavings || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Monthly</span>
                      <span className="font-semibold">{formatCurrency(monthlyOperationalSavings || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Annual</span>
                      <span className="font-semibold">{formatCurrency(annualOperationalSavings || 0)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
                  <CardHeader>
                    <CardTitle className="text-blue-700 text-base flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Laundry Boss Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-sm" style={{ color: "#2D2926" }}>
                            EMV/EBT Capable Payment System
                          </div>
                          <p className="text-xs text-gray-600">
                            Accept all major payment methods including EBT/SNAP benefits
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <BarChart3 className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-sm" style={{ color: "#2D2926" }}>
                            Advanced Data Analytics
                          </div>
                          <p className="text-xs text-gray-600">
                            Real-time insights into revenue, usage patterns, and customer behavior
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-cyan-200">
                      <p className="text-xs text-blue-700 font-medium">
                        Plus: Mobile app integration, remote monitoring, automated reporting, and 24/7 customer support
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {isDistributor
                  ? `Distributor Pricing Quote for ${quote.prospect_name}`
                  : `Pricing Quote for ${quote.prospect_name}`}
              </CardTitle>
              {isDistributor && (
                <p className="text-sm text-blue-600 font-medium">
                  Distributor: {quote.distributor_name} • Special pricing applied: 30% off kiosks, 20% off monthly
                  services
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p>
                    <strong>Owner:</strong> {quote.owner_name || "Not specified"}
                  </p>
                  <p>
                    <strong>Store Size:</strong> {quote.store_size?.toLocaleString() || "Not specified"} sq ft
                  </p>
                  <p>
                    <strong>Total Machines:</strong> {totalMachines} ({quote.num_washers || 0} washers,{" "}
                    {quote.num_dryers || 0} dryers)
                  </p>
                  <p>
                    <strong>Reported Monthly Revenue:</strong>{" "}
                    {monthlyRevenueBaseline > 0 ? formatCurrency(monthlyRevenueBaseline) : "Not provided"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    <strong>Payment Methods:</strong>{" "}
                    {[quote.accepts_cash && "Cash", quote.accepts_cards && "Cards"].filter(Boolean).join(", ") ||
                      "None specified"}
                  </p>
                  <p>
                    <strong>Services:</strong>{" "}
                    {[
                      quote.has_wdf && `Current WDF (${quote.wdf_provider || "Unknown"})`,
                      quote.wants_wdf && "Laundry Boss Wash Dry Fold",
                      quote.wants_pickup_delivery && "Laundry Boss Pickup & Delivery",
                      quote.ai_integration && "AI Attendant with Integration",
                      quote.ai_attendant && !quote.ai_integration && "AI Attendant",
                    ]
                      .filter(Boolean)
                      .join(", ") || "Self-service only"}
                  </p>
                  <p>
                    <strong>Kiosks:</strong> {getSelectedKiosks()}
                  </p>
                  <p>
                    <strong>Email:</strong> {quote.customer_email || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Options */}
          {isDistributor ? (
            <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
              <CardHeader>
                <CardTitle className="text-cyan-700">Distributor Total Price</CardTitle>
                <p className="text-sm text-gray-600">One-time payment includes 48 months of service + setup costs</p>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="bg-white rounded-lg p-6 border-2 border-cyan-200">
                    <p className="text-cyan-600 font-semibold text-lg mb-2">Total Distributor Price</p>
                    <p className="text-4xl font-bold text-cyan-600 mb-2">
                      {formatCurrency(quote.distributor_total_price)}
                    </p>
                    <p className="text-sm text-gray-600">One-time payment • No financing required</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Option 1: Total Price */}
              <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
                <CardHeader>
                  <CardTitle className="text-cyan-700">Option 1: Total Price</CardTitle>
                  <p className="text-sm text-gray-600">One-time payment for complete solution</p>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="bg-white rounded-lg p-6 border-2 border-cyan-200">
                      <p className="text-cyan-600 font-semibold text-lg mb-2">Total Price</p>
                      <p className="text-4xl font-bold text-cyan-600 mb-2">
                        {formatCurrency(quote.total_price_option1)}
                      </p>
                      <p className="text-sm text-gray-600">One-time payment • No monthly fees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Option 2: Financed */}
              <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
                <CardHeader>
                  <CardTitle className="text-cyan-700">Option 2: Financed Solution</CardTitle>
                  <p className="text-sm text-gray-600">
                    Finance all costs over 48 months at {quote.option2_interest_rate || 9}% APR
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div>
                      <p className="text-cyan-600 font-semibold text-lg">Financed Monthly Payment</p>
                      <p className="text-3xl font-bold text-cyan-600">
                        {formatCurrency(quote.financed_monthly_payment)}
                      </p>
                      <p className="text-sm text-gray-600">per month for 48 months at {interestRate}% APR</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p>
                          <strong>Total of payments:</strong> {formatCurrency(totalOfPayments)}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Total interest:</strong> {formatCurrency(totalInterest)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <Button
                      variant="ghost"
                      onClick={() => setShowFinanceDetails(!showFinanceDetails)}
                      className="w-full flex items-center justify-center gap-2 text-cyan-600 hover:text-cyan-700"
                    >
                      {showFinanceDetails ? "Hide" : "Show"} Calculation Details
                      {showFinanceDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {showFinanceDetails && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-700">Monthly Services Calculation</h4>
                            <div className="flex justify-between text-sm">
                              <span>Monthly recurring × 48 months</span>
                              <span>{formatCurrency(monthlyTotal48)}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                              <span className="flex items-center gap-1">
                                Present value (discounted)
                                <div className="group relative">
                                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-64 z-10">
                                    <div className="text-center">
                                      <strong>Present Value Explained:</strong>
                                      <br />
                                      This is the current worth of your future monthly payments. Since money today is
                                      worth more than money in the future (due to inflation and opportunity cost), we
                                      discount future payments to their present value using a 12.5% annual discount
                                      rate. This creates savings compared to paying the full monthly amount over 48
                                      months.
                                    </div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                  </div>
                                </div>
                              </span>
                              <span className="text-green-600">{formatCurrency(monthlyPV)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>Savings from PV discount</span>
                              <span>-{formatCurrency(monthlyTotal48 - monthlyPV)}</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-700">Total to Finance</h4>
                            <div className="flex justify-between text-sm">
                              <span>Present value of monthly services</span>
                              <span>{formatCurrency(monthlyPV)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>One-time charges</span>
                              <span>{formatCurrency(quote.one_time_charges)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-semibold">
                              <span>Total Amount to Finance</span>
                              <span>{formatCurrency(totalToFinance)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Option 3: Monthly Plan */}
              <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
                <CardHeader>
                  <CardTitle className="text-center text-xl">Option 3: Monthly Payment Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-cyan-600 font-semibold">Monthly Recurring</p>
                      <p className="text-2xl font-bold text-cyan-600">{formatCurrency(quote.monthly_recurring)}</p>
                      <p className="text-sm text-gray-600">(48-month contract)</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-semibold">One-Time Setup</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(quote.one_time_charges)}</p>
                      <p className="text-sm text-gray-600">(Upfront payment)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
                    <CardHeader>
                      <CardTitle className="text-cyan-600">Monthly Recurring Fees</CardTitle>
                      <p className="text-sm text-gray-600">Based on 48-month contract</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Washers ({quote.num_washers || 0} × $5.00)</span>
                        <span>{formatCurrency((quote.num_washers || 0) * 5)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>QR Codes ({qrCodeInfo.sheets} × $110.00)</span>
                        <span>{formatCurrency(qrCodeInfo.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sign Package</span>
                        <span>{formatCurrency(140)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Matterport 3D Scan</span>
                        <span>{formatCurrency(350)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>FULL Network Package</span>
                        <span>{formatCurrency(1875)}</span>
                      </div>
                      {posSystemFee > 0 && (
                        <div className="flex justify-between">
                          <span>Laundry Boss Point of Sale System</span>
                          <span>{formatCurrency(posSystemFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Laundry Boss Installation</span>
                        <span>
                          {formatCurrency(
                            (quote.one_time_charges || 0) -
                              totalMachines * 25 -
                              qrCodeInfo.totalCost -
                              140 -
                              350 -
                              1875 -
                              posSystemFee,
                          )}
                        </span>
                      </div>
                      {quote.self_install && (
                        <div className="text-xs text-gray-500 -mt-2 ml-4">Self-install with assistance</div>
                      )}
                      {!quote.self_install && (
                        <div className="text-xs text-gray-500 -mt-2 ml-4">
                          Full installation service ({totalMachines} machines)
                        </div>
                      )}
                      {/* Kiosk details would go here if we had that data in the quote */}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>One-Time Total</span>
                        <span className="text-blue-600">{formatCurrency(quote.one_time_charges)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
                    <CardHeader>
                      <CardTitle className="text-blue-600">One-Time Charges</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Harnesses ({totalMachines} × $25.00)</span>
                        <span>{formatCurrency(totalMachines * 25)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>QR Codes ({qrCodeInfo.sheets} × $110.00)</span>
                        <span>{formatCurrency(qrCodeInfo.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sign Package</span>
                        <span>{formatCurrency(140)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Matterport 3D Scan</span>
                        <span>{formatCurrency(350)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>FULL Network Package</span>
                        <span>{formatCurrency(1875)}</span>
                      </div>
                      {posSystemFee > 0 && (
                        <div className="flex justify-between">
                          <span>Laundry Boss Point of Sale System</span>
                          <span>{formatCurrency(posSystemFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Laundry Boss Installation</span>
                        <span>
                          {formatCurrency(
                            (quote.one_time_charges || 0) -
                              totalMachines * 25 -
                              qrCodeInfo.totalCost -
                              140 -
                              350 -
                              1875 -
                              posSystemFee,
                          )}
                        </span>
                      </div>
                      {quote.self_install && (
                        <div className="text-xs text-gray-500 -mt-2 ml-4">Self-install with assistance</div>
                      )}
                      {!quote.self_install && (
                        <div className="text-xs text-gray-500 -mt-2 ml-4">
                          Full installation service ({totalMachines} machines)
                        </div>
                      )}
                      {/* Kiosk details would go here if we had that data in the quote */}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>One-Time Total</span>
                        <span className="text-blue-600">{formatCurrency(quote.one_time_charges)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {quote.additional_notes && (
            <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{quote.additional_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Quote Metadata */}
          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
            <CardHeader>
              <CardTitle>Quote Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <strong>Created:</strong> {new Date(quote.created_at).toLocaleString()}
                  </p>
                  <p>
                    <strong>Status:</strong> {quote.status || "Unknown"}
                  </p>
                  <p>
                    <strong>Expected Close:</strong>{" "}
                    {quote.expected_close_date ? new Date(quote.expected_close_date).toLocaleDateString() : "Not set"}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Current Vendor:</strong> {quote.current_vendor || "Not specified"}
                  </p>
                  <p>
                    <strong>Self Install:</strong> {quote.self_install ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Quote ID:</strong> {quote.id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      )}
    </Card>
  )
}

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const quotesPerPage = 10

  const fetchQuotes = async (page = 1) => {
    try {
      setLoading(true)
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

      const { count } = await supabase.from("quotes").select("*", { count: "exact", head: true })

      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .range((page - 1) * quotesPerPage, page * quotesPerPage - 1)

      if (error) {
        console.error("Supabase error:", error)
        setError(error.message)
      } else {
        console.log("Fetched quotes:", data?.length || 0, "of", count || 0, "total")
        setQuotes(data || [])
        setTotalCount(count || 0)
        setError(null)
      }
    } catch (err) {
      console.error("Error fetching quotes:", err)
      setError("Failed to fetch quotes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes(currentPage)

    const interval = setInterval(() => {
      fetchQuotes(currentPage)
    }, 30000)

    return () => clearInterval(interval)
  }, [currentPage])

  const handleDeleteQuote = (deletedId: string) => {
    setQuotes(quotes.filter((quote) => quote.id !== deletedId))
    setTotalCount((prev) => prev - 1)

    if (quotes.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleRefresh = () => {
    fetchQuotes(currentPage)
  }

  const totalPages = Math.ceil(totalCount / quotesPerPage)
  const startIndex = (currentPage - 1) * quotesPerPage + 1
  const endIndex = Math.min(currentPage * quotesPerPage, totalCount)

  if (loading) {
    return (
      <main className="min-h-screen p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">Loading quotes...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 max-w-6xl mx-auto">
        <div className="text-center py-12 text-red-600">Error: {error}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Quote Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/admin">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotes ({totalCount})</CardTitle>
          <p className="text-sm text-gray-600">
            Each quote is displayed exactly as it appears in the pricing calculator tool. Showing {quotesPerPage} quotes
            per page. Auto-refreshes every 30 seconds, or click refresh to see newly generated quotes immediately.
          </p>
        </CardHeader>
      </Card>

      {totalCount === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">No quotes found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex} to {endIndex} of {totalCount} quotes
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {quotes.map((quote) => (
              <QuoteDisplay key={quote.id} quote={quote} onDelete={handleDeleteQuote} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
