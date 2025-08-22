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

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getPricingOptionName = (quote: any) => {
    try {
      if (quote.additional_savings_monthly) {
        const pricingData =
          typeof quote.additional_savings_monthly === "string"
            ? JSON.parse(quote.additional_savings_monthly)
            : quote.additional_savings_monthly

        if (pricingData.selectedOption) {
          return pricingData.selectedOption
        }

        if (
          pricingData.hasCleanShowPricing ||
          pricingData.selectedOption?.includes("Clean Show") ||
          pricingData.selectedOption?.includes("Option 4")
        ) {
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Quote Detail</h1>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Quote
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
            </>
          ) : (
            <>
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

          <Card>
            <CardHeader>
              <CardTitle>📈 Revenue Impact Overview</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle>Pricing Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Option 1: Total Price */}
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold">Option 1: Total Price</h4>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(q.total_price_option1)}</p>
                    <p className="text-sm text-muted-foreground">One-time payment</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pay the full amount upfront and own your Laundry Boss system immediately.
                </p>
              </div>

              {/* Option 2: Financed Solution */}
              {q.financed_monthly_payment && (
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-semibold">Option 2: Financed Solution</h4>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(q.financed_monthly_payment)}</p>
                      <p className="text-sm text-muted-foreground">per month for 48 months</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Finance your Laundry Boss system at {q.option2_interest_rate || 9}% interest rate.
                  </p>
                </div>
              )}

              {/* Option 3: Monthly Payment Plan */}
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold">Option 3: Monthly Payment Plan</h4>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(q.monthly_recurring)}</p>
                    <p className="text-sm text-muted-foreground">per month + one-time setup</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Low monthly payments with comprehensive service package.
                </p>
              </div>

              {(() => {
                const hasCleanShowPricing =
                  getPricingOptionName(q).includes("Clean Show") || getPricingOptionName(q).includes("Option 4")
                if (hasCleanShowPricing) {
                  try {
                    const pricingData = q.additional_savings_monthly
                      ? typeof q.additional_savings_monthly === "string"
                        ? JSON.parse(q.additional_savings_monthly)
                        : q.additional_savings_monthly
                      : null

                    const cleanShowTotalPrice =
                      pricingData?.cleanShowTotalPrice || q.monthly_recurring * 48 * 0.8 + q.one_time_charges * 0.7

                    return (
                      <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-lg font-semibold text-purple-800">
                            🎉 Option 4: Clean Show 2025 Special Pricing
                          </h4>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-600">{formatCurrency(cleanShowTotalPrice)}</p>
                            <p className="text-sm text-muted-foreground">Total system cost</p>
                          </div>
                        </div>
                        <p className="text-sm text-purple-600">
                          Limited-time exclusive offer with 20% discount on monthly services and 30% discount on kiosks.
                        </p>
                      </div>
                    )
                  } catch (e) {
                    return null
                  }
                }
                return null
              })()}

              {/* Distributor Pricing */}
              {(q.distributor || (q.distributor_name && q.distributor_name.trim() !== "")) && (
                <div className="border rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-orange-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-semibold text-orange-800">🏆 Distributor Pricing</h4>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(q.total_price_option1)}</p>
                      <p className="text-sm text-muted-foreground">Total system cost</p>
                    </div>
                  </div>
                  <p className="text-sm text-orange-600">Exclusive pricing for {q.distributor_name || "distributor"}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const breakdown = getServiceBreakdown(q)
                return (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Monthly Services</h4>
                      <div className="space-y-2 text-sm">
                        {breakdown.monthlyServices.map((service, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{service.name}</span>
                            <span>{formatCurrency(service.price)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-medium pt-2 border-t">
                          <span>Total Monthly:</span>
                          <span>{formatCurrency(q.monthly_recurring)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">One-Time Charges</h4>
                      <div className="space-y-2 text-sm">
                        {breakdown.oneTimeCharges.map((charge, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{charge.name}</span>
                            <span>{formatCurrency(charge.price)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-medium pt-2 border-t">
                          <span>Total One-Time:</span>
                          <span>{formatCurrency(q.one_time_charges)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
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
