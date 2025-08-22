"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

type Quote = {
  id: string
  created_at: string
  prospect_name: string | null
  owner_name: string | null
  distributor_name: string | null
  customer_email: string | null
  customer_phone: string | null // Added phone number field
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
  wants_wash_dry_fold: boolean | null
  has_ai_attendant_with_integration: boolean | null
  has_ai_attendant: boolean | null
}

type QuoteDisplayProps = {
  quote: Quote
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Quote>) => void
}

const QuoteDisplay = ({ quote, onDelete, onUpdate }: QuoteDisplayProps) => {
  const [showFinanceDetails, setShowFinanceDetails] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingFinanceRate, setEditingFinanceRate] = useState(false)
  const [newFinanceRate, setNewFinanceRate] = useState(quote.option2_interest_rate || 9)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setNewFinanceRate(quote.option2_interest_rate || 9)
  }, [quote.option2_interest_rate])

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
  const interestRate = newFinanceRate
  const financedMonthlyPayment = calculateLoanPayment(totalToFinance, interestRate)
  const totalOfPayments = financedMonthlyPayment * 48
  const totalInterest = totalOfPayments - totalToFinance

  const posSystemFee = quote.wants_wdf || quote.wants_pickup_delivery ? 3125 : 0

  const handleFinanceRateUpdate = async () => {
    if (newFinanceRate === (quote.option2_interest_rate || 9)) {
      setEditingFinanceRate(false)
      return
    }

    setIsUpdating(true)
    try {
      const newFinancedPayment = calculateLoanPayment(totalToFinance, newFinanceRate)

      const response = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          option2_interest_rate: newFinanceRate,
          financed_monthly_payment: newFinancedPayment,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update financing rate")
      }

      const updatedQuote = await response.json()
      onUpdate(quote.id, updatedQuote)
      setEditingFinanceRate(false)
    } catch (err) {
      console.error("Error updating financing rate:", err)
      alert("Failed to update financing rate")
      setNewFinanceRate(quote.option2_interest_rate || 9) // Reset to original value
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this quote? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.text()
        alert("Failed to delete quote: " + error)
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
            <Link href={`/admin/quotes/${quote.id}`}>
              <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                View Details
              </Button>
            </Link>
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
          {/* 4 Quadrants - Revenue Growth Projections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Current Revenue */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-green-700 text-lg font-bold flex items-center justify-center gap-2">
                  📈 Current Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-1">
                <div className="text-sm">
                  <div>Weekly: {formatCurrency((monthlyRevenueBaseline || 0) / weeksPerMonth)}</div>
                  <div>Monthly: {formatCurrency(monthlyRevenueBaseline || 0)}</div>
                  <div className="font-semibold">Annual: {formatCurrency((monthlyRevenueBaseline || 0) * 12)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Projected with Laundry Boss */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-blue-700 text-lg font-bold">Projected with Laundry Boss</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-1">
                <div className="text-sm">
                  <div>Weekly: {formatCurrency(projectedWeeklyAfterLB || 0)}</div>
                  <div>Monthly: {formatCurrency(projectedMonthlyAfterLB || 0)}</div>
                  <div className="font-semibold">Annual: {formatCurrency(projectedAnnualAfterLB || 0)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Revenue */}
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-amber-700 text-lg font-bold flex items-center justify-center gap-2">
                  💰 Additional Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-1">
                <div className="text-sm">
                  <div>{formatCurrency(addedWeeklyRevenue || 0)}/week</div>
                  <div>{formatCurrency(addedMonthlyRevenue || 0)}/month</div>
                  <div className="font-semibold">{formatCurrency(addedAnnualRevenue || 0)}/year</div>
                </div>
                <div className="text-xs text-amber-600 mt-2">Based on 15.3% average increase in first ~90 days</div>
              </CardContent>
            </Card>

            {/* Operational Savings */}
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-purple-700 text-lg font-bold flex items-center justify-center gap-2">
                  🔧 Operational Savings
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-1">
                <div className="text-sm">
                  <div>{formatCurrency(weeklyOperationalSavings || 0)}/week</div>
                  <div>{formatCurrency(monthlyOperationalSavings || 0)}/month</div>
                  <div className="font-semibold">{formatCurrency(annualOperationalSavings || 0)}/year</div>
                </div>
                <div className="text-xs text-purple-600 mt-2">
                  Reduced wear and tear from embedded readers. Smart monitoring and preventive alerts.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Impact Overview */}
          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
            <CardHeader className="text-center">
              <CardTitle className="text-cyan-700 text-2xl font-bold">Revenue Impact Overview</CardTitle>
              <div className="text-lg font-semibold text-gray-700 mt-2">
                Owner-Reported Monthly Revenue:{" "}
                {monthlyRevenueBaseline > 0 ? formatCurrency(monthlyRevenueBaseline) : "Not provided"}
              </div>
            </CardHeader>
            <CardContent>
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
                  <div className="grid grid-cols-3 text-sm bg-cyan-50 font-semibold">
                    <div className="px-4 py-3">Annual Revenue After LB</div>
                    <div className="px-4 py-3 text-center">—</div>
                    <div className="px-4 py-3 text-center">{formatCurrency(projectedAnnualAfterLB || 0)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Why Laundry Boss is a Perfect Fit */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader className="text-center">
              <CardTitle className="text-indigo-700 text-xl font-bold">Why Laundry Boss is a Perfect Fit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">Proven track record of 15.3% average revenue increase</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">Smart monitoring reduces equipment downtime</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">Enhanced customer experience drives repeat business</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">Real-time analytics help optimize operations</p>
                </div>
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
                  <p>
                    <strong>Phone:</strong> {quote.customer_phone || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <CardTitle className="text-center text-xl text-cyan-700">Option 1: Total Price</CardTitle>
                  <p className="text-sm text-gray-600 text-center">One-time payment for complete solution</p>
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
                  <CardTitle className="text-center text-xl text-cyan-700">Option 2: Financed Solution</CardTitle>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Finance all costs over 48 months at {interestRate}% APR</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="bg-white rounded-lg p-6 border-2 border-cyan-200">
                      <p className="text-cyan-600 font-semibold text-lg mb-2">Financed Monthly Payment</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(financedMonthlyPayment)}</p>
                      <p className="text-sm text-gray-600">
                        48-month term • Includes all hardware, software, and services
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {editingFinanceRate ? (
                        <>
                          <Input
                            type="number"
                            value={newFinanceRate}
                            onChange={(e) => setNewFinanceRate(Number(e.target.value))}
                            className="w-20 text-center"
                          />
                          <Button size="sm" onClick={handleFinanceRateUpdate} disabled={isUpdating}>
                            {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Update"}
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setEditingFinanceRate(true)}>
                          Edit Finance Rate
                        </Button>
                      )}
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">Total of Payments</p>
                      <p>{formatCurrency(totalOfPayments)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Total Interest</p>
                      <p>{formatCurrency(totalInterest)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Present Value</p>
                      <p>{formatCurrency(monthlyPV)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">One-Time Charges</p>
                      <p>{formatCurrency(quote.one_time_charges)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Total to Finance</p>
                      <p>{formatCurrency(totalToFinance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Option 3: Monthly Plan */}
              <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
                <CardHeader>
                  <CardTitle className="text-center text-xl">Option 3: Monthly Payment Plan</CardTitle>
                  <p className="text-sm text-gray-600 text-center">
                    Low monthly payments with comprehensive service package
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center mb-4">
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

                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-3">Monthly Recurring Fees</h4>
                      <p className="text-sm text-gray-600 mb-2">Based on 48-month contract</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Washers ({quote.num_washers || 0} × $5.00)</span>
                          <span>{formatCurrency((quote.num_washers || 0) * 5)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dryers ({quote.num_dryers || 0} × $5.00)</span>
                          <span>{formatCurrency((quote.num_dryers || 0) * 5)}</span>
                        </div>
                        {(quote.wants_wash_dry_fold || quote.wants_wdf) && (
                          <div className="flex justify-between">
                            <span>WDF Software License</span>
                            <span>{formatCurrency(100)}</span>
                          </div>
                        )}
                        {quote.wants_pickup_delivery && (
                          <div className="flex justify-between">
                            <span>Pick Up & Delivery License</span>
                            <span>{formatCurrency(100)}</span>
                          </div>
                        )}
                        {quote.ai_attendant && (
                          <div className="flex justify-between">
                            <span>AI Attendant Service</span>
                            <span>{formatCurrency(50)}</span>
                          </div>
                        )}
                        {quote.ai_integration && (
                          <div className="flex justify-between">
                            <span>AI Integration Service</span>
                            <span>{formatCurrency(100)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Monthly Total</span>
                          <span className="text-cyan-600">{formatCurrency(quote.monthly_recurring)}</span>
                        </div>
                      </div>
                    </div>

                    {/* One-Time Charges */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">One-Time Charges</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Harnesses ({totalMachines} × $25.00)</span>
                          <span>{formatCurrency(totalMachines * 25)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>QR Codes</span>
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
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>One-Time Total</span>
                          <span className="text-blue-600">{formatCurrency(quote.one_time_charges)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-purple-100 rounded">
                    <p className="text-purple-800 font-medium">
                      💰 Total System Cost: {formatCurrency(quote.total_price_option1)}
                    </p>
                    <div className="mt-3 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                      <h4 className="font-semibold text-cyan-800 mb-2">48-Month Total Investment</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Monthly Payments (48 × {formatCurrency(quote.monthly_recurring)})</span>
                          <span>{formatCurrency((quote.monthly_recurring || 0) * 48)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>One-Time Setup Charges</span>
                          <span>{formatCurrency(quote.one_time_charges)}</span>
                        </div>
                        <div className="border-t pt-1 font-semibold flex justify-between text-cyan-800">
                          <span>Total 48-Month Investment</span>
                          <span>
                            {formatCurrency((quote.monthly_recurring || 0) * 48 + (quote.one_time_charges || 0))}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-cyan-600 text-center mt-2">
                        Comprehensive service package with predictable monthly payments
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Option 4: Clean Show 2025 Special Pricing */}
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="text-center text-xl text-purple-700">
                    🎉 Option 4: Clean Show 2025 Special
                  </CardTitle>
                  <p className="text-sm text-center text-purple-600">
                    Limited-time exclusive offer - expires March 31, 2025
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center mb-4">
                    <div>
                      <p className="text-purple-600 font-semibold">Special Monthly Rate</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency((quote.monthly_recurring || 0) * 0.8)}
                      </p>
                      <p className="text-sm text-gray-600">(20% off regular monthly rate)</p>
                    </div>
                    <div>
                      <p className="text-pink-600 font-semibold">Reduced Setup Cost</p>
                      <p className="text-2xl font-bold text-pink-600">
                        {formatCurrency((quote.one_time_charges || 0) * 0.7)}
                      </p>
                      <p className="text-sm text-gray-600">(30% off setup costs)</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-3">Monthly Services (20% Discount)</h4>
                      <p className="text-sm text-gray-600 mb-2">Based on 48-month contract</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Washers ({quote.num_washers || 0} × $4.00)</span>
                          <span>{formatCurrency((quote.num_washers || 0) * 4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dryers ({quote.num_dryers || 0} × $4.00)</span>
                          <span>{formatCurrency((quote.num_dryers || 0) * 4)}</span>
                        </div>
                        {(quote.wants_wash_dry_fold || quote.wants_wdf) && (
                          <div className="flex justify-between">
                            <span>WDF Software License</span>
                            <span>$80.00</span>
                          </div>
                        )}
                        {quote.wants_pickup_delivery && (
                          <div className="flex justify-between">
                            <span>Pick Up & Delivery License</span>
                            <span>$80.00</span>
                          </div>
                        )}
                        {quote.ai_attendant && (
                          <div className="flex justify-between">
                            <span>AI Attendant Service</span>
                            <span>$40.00</span>
                          </div>
                        )}
                        {quote.ai_integration && (
                          <div className="flex justify-between">
                            <span>AI Integration Service</span>
                            <span>$80.00</span>
                          </div>
                        )}
                        <div className="border-t pt-1 font-semibold flex justify-between">
                          <span>Monthly Total</span>
                          <span>{formatCurrency((quote.monthly_recurring || 0) * 0.8)}</span>
                        </div>
                      </div>
                    </div>

                    {/* One-Time Charges with Clean Show Pricing */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">One-Time Charges (30% Kiosk Discount)</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Harnesses ({totalMachines} × $25.00)</span>
                          <span>{formatCurrency(totalMachines * 25)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>QR Codes</span>
                          <span>$150.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sign Package</span>
                          <span>$500.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Matterport 3D Scan</span>
                          <span>$500.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>FULL Network Package</span>
                          <span>$1,500.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Laundry Boss Point of Sale System</span>
                          <span>$2,500.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Laundry Boss Installation</span>
                          <span>$2,000.00</span>
                        </div>
                        <div className="border-t pt-1 font-semibold flex justify-between">
                          <span>One-Time Total</span>
                          <span>{formatCurrency((quote.one_time_charges || 0) * 0.7)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-purple-100 rounded-lg">
                    <p className="text-sm text-purple-700 text-center font-medium">
                      🎉 Clean Show 2025 Exclusive: Save up to{" "}
                      {formatCurrency((quote.monthly_recurring || 0) * 0.2 * 48 + (quote.one_time_charges || 0) * 0.3)}{" "}
                      over 48 months!
                    </p>
                    <p className="text-xs text-purple-600 text-center mt-1">
                      Same great pricing as our distributors - limited time offer!
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Service Breakdown */}
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
                        <span>Dryers ({quote.num_dryers || 0} × $5.00)</span>
                        <span>{formatCurrency((quote.num_dryers || 0) * 5)}</span>
                      </div>
                      {quote.wants_wdf && (
                        <div className="flex justify-between">
                          <span>WDF Software License</span>
                          <span>{formatCurrency(100)}</span>
                        </div>
                      )}
                      {quote.wants_pickup_delivery && (
                        <div className="flex justify-between">
                          <span>Pick Up & Delivery License</span>
                          <span>{formatCurrency(100)}</span>
                        </div>
                      )}
                      {quote.ai_attendant && (
                        <div className="flex justify-between">
                          <span>AI Attendant Service</span>
                          <span>{formatCurrency(50)}</span>
                        </div>
                      )}
                      {quote.ai_integration && (
                        <div className="flex justify-between">
                          <span>AI Integration Service</span>
                          <span>{formatCurrency(100)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Monthly Total</span>
                        <span className="text-cyan-600">{formatCurrency(quote.monthly_recurring)}</span>
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
  const [quotesPerPage] = useState(10)

  const fetchQuotes = async (page = 1) => {
    try {
      setLoading(true)
      console.log("[v0] Fetching quotes for page:", page)
      const response = await fetch(`/api/admin/quotes?page=${page}&limit=${quotesPerPage}`)

      if (!response.ok) {
        throw new Error("Failed to fetch quotes")
      }

      const result = await response.json()
      console.log("[v0] Fetched quotes:", result.quotes?.length || 0, "of", result.totalCount || 0, "total")
      setQuotes(result.quotes || [])
      setTotalCount(result.totalCount || 0)
      setError(null)
    } catch (err) {
      console.error("[v0] Error fetching quotes:", err)
      setError("Failed to fetch quotes")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQuote = (id: string, updates: Partial<Quote>) => {
    setQuotes(quotes.map((quote) => (quote.id === id ? { ...quote, ...updates } : quote)))
  }

  useEffect(() => {
    fetchQuotes(currentPage)

    const interval = setInterval(() => {
      fetchQuotes(currentPage)
    }, 30000)

    return () => clearInterval(interval)
  }, [currentPage, quotesPerPage])

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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1)
    }
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

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">No quotes found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {startIndex} to {endIndex} of {totalCount} quotes (Page {currentPage} of {totalPages})
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 7) {
                          pageNum = i + 1
                        } else if (currentPage <= 4) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 3) {
                          pageNum = totalPages - 6 + i
                        } else {
                          pageNum = currentPage - 3 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-10 h-8 p-0 text-sm"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                      Next
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {quotes.map((quote) => (
              <QuoteDisplay key={quote.id} quote={quote} onDelete={handleDeleteQuote} onUpdate={handleUpdateQuote} />
            ))}
          </div>

          {totalPages > 1 && (
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Previous Page
                  </Button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Page</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 10) {
                          pageNum = i + 1
                        } else if (currentPage <= 5) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 4) {
                          pageNum = totalPages - 9 + i
                        } else {
                          pageNum = currentPage - 4 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-10 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <span className="text-sm text-gray-600">of {totalPages}</span>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    Next Page
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  )
}
