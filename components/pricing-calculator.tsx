"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { ChevronDown, ChevronUp, Info, CreditCard, BarChart3 } from "lucide-react"
import { pricingData, calculateInstallationCost, calculateQRCodeCost, calculatePOSSystemCost } from "@/lib/pricing-data"
import type { QuestionnaireData } from "./questionnaire"

interface PricingCalculatorProps {
  data: QuestionnaireData
  onBack: () => void
  onNewQuote: () => void
}

export function PricingCalculator({ data, onBack, onNewQuote }: PricingCalculatorProps) {
  const [interestRate, setInterestRate] = useState(9)
  const [showFinanceDetails, setShowFinanceDetails] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const isDistributor = data.distributorName.trim() !== ""

  // Added: Revenue uplift and savings assumptions
  const upliftRate = 0.153 // 15.3% LB average increase in first ~90 days
  const monthlyRevenueBaseline = Math.max(0, Number(data.monthlyRevenue || 0))
  const addedMonthlyRevenue = monthlyRevenueBaseline * upliftRate
  const projectedMonthlyAfterLB = monthlyRevenueBaseline + addedMonthlyRevenue

  const weeksPerMonth = 4.33 // average
  const addedWeeklyRevenue = addedMonthlyRevenue / weeksPerMonth
  const addedAnnualRevenue = addedMonthlyRevenue * 12

  const projectedWeeklyAfterLB = projectedMonthlyAfterLB / weeksPerMonth
  const projectedAnnualAfterLB = projectedMonthlyAfterLB * 12

  // Additional operational savings (embedded readers reduce wear and tear, etc.)
  // Base assumption: ~$5,500/year savings at 30 machines => ~$183.33 per machine per year
  const perMachineAnnualSavings = 5500 / 30
  const totalMachines = data.numWashers + data.numDryers
  const annualOperationalSavings = perMachineAnnualSavings * totalMachines
  const monthlyOperationalSavings = annualOperationalSavings / 12
  const weeklyOperationalSavings = annualOperationalSavings / 52

  // Calculate Present Value of monthly payments over 48 months
  const calculatePresentValue = (monthlyPayment: number, months = 48, discountRate = 0.125) => {
    const monthlyRate = discountRate / 12
    const pv = monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate)
    return pv
  }

  // Calculate monthly loan payment (PMT function)
  const calculateLoanPayment = (principal: number, annualRate: number, months = 48) => {
    const monthlyRate = annualRate / 100 / 12
    const payment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) / (Math.pow(1 + monthlyRate, months) - 1)
    return payment
  }

  const calculatePricing = () => {
    let monthlyRecurring = 0
    let oneTimeCharges = 0

    // Monthly recurring fees
    let washerPrice = pricingData.monthlyRecurring.washers.price
    let dryerPrice = pricingData.monthlyRecurring.dryers.price
    let wdfPrice = pricingData.monthlyRecurring.wdfSoftware.price
    let pickupPrice = pricingData.monthlyRecurring.pickupDelivery.price
    let aiAttendantPrice = pricingData.monthlyRecurring.aiAttendant.price
    let aiIntegrationPrice = pricingData.monthlyRecurring.aiAttendantWithIntegration.price

    // Apply 20% discount to monthly services for distributors
    if (isDistributor) {
      washerPrice *= 0.8
      dryerPrice *= 0.8
      wdfPrice *= 0.8
      pickupPrice *= 0.8
      aiAttendantPrice *= 0.8
      aiIntegrationPrice *= 0.8
    }

    monthlyRecurring += data.numWashers * washerPrice
    monthlyRecurring += data.numDryers * dryerPrice

    if (data.wantsWashDryFold) {
      monthlyRecurring += wdfPrice
    }

    if (data.wantsPickupDelivery) {
      monthlyRecurring += pickupPrice
    }

    // AI Services
    if (data.hasAiAttendantWithIntegration) {
      // Integration service includes both AI Attendant base service + integration
      monthlyRecurring += aiAttendantPrice // Base AI Attendant Service
      monthlyRecurring += aiIntegrationPrice // Integration Service
    } else if (data.hasAiAttendant) {
      monthlyRecurring += aiAttendantPrice // Just the base AI Attendant Service
    }

    // One-time charges (standard package)
    const totalMachinesLocal = data.numWashers + data.numDryers
    oneTimeCharges += totalMachinesLocal * pricingData.oneTimeCharges.harnesses.price

    const qrCodeInfo = calculateQRCodeCost(totalMachinesLocal)
    oneTimeCharges += qrCodeInfo.totalCost

    const posSystemCost = calculatePOSSystemCost(data.wantsWashDryFold, data.wantsPickupDelivery)
    oneTimeCharges += posSystemCost

    oneTimeCharges += pricingData.oneTimeCharges.signPackage.price
    oneTimeCharges += pricingData.oneTimeCharges.matterport3D.price

    // Calculate installation cost based on machine count and self-install option
    const installationCost = calculateInstallationCost(totalMachinesLocal, data.selfInstall)
    oneTimeCharges += installationCost

    oneTimeCharges += pricingData.oneTimeCharges.fullNetworkPackage.price

    // Kiosk options with 30% discount for distributors
    const kioskDiscount = isDistributor ? 0.7 : 1.0

    if (data.kioskOptions.rearLoad.selected) {
      oneTimeCharges +=
        pricingData.kioskOptions.rearLoadKiosk.price * data.kioskOptions.rearLoad.quantity * kioskDiscount
    }
    if (data.kioskOptions.frontLoad.selected) {
      oneTimeCharges +=
        pricingData.kioskOptions.frontLoadKiosk.price * data.kioskOptions.frontLoad.quantity * kioskDiscount
    }
    if (data.kioskOptions.creditBill.selected) {
      oneTimeCharges +=
        pricingData.kioskOptions.creditBillKiosk.price * data.kioskOptions.creditBill.quantity * kioskDiscount
    }
    if (data.kioskOptions.creditOnly.selected) {
      oneTimeCharges +=
        pricingData.kioskOptions.creditOnlyKiosk.price * data.kioskOptions.creditOnly.quantity * kioskDiscount
    }

    return { monthlyRecurring, oneTimeCharges, installationCost, qrCodeInfo, posSystemCost }
  }

  const { monthlyRecurring, oneTimeCharges, installationCost, qrCodeInfo, posSystemCost } = calculatePricing()

  // Option calculations (only for non-distributors)
  const monthlyTotal48 = monthlyRecurring * 48 // Gross total over 48 months
  const monthlyPV = calculatePresentValue(monthlyRecurring) // Present value of monthly payments
  const totalToFinance = monthlyPV + oneTimeCharges // PV + one-time costs
  const financedMonthlyPayment = calculateLoanPayment(totalToFinance, interestRate, 48) // Finance over 48 months

  // Option 1: Total price (monthly × 48 + one-time)
  const totalPrice = monthlyTotal48 + oneTimeCharges

  // Distributor total price (monthly × 48 + one-time)
  const distributorTotalPrice = monthlyRecurring * 48 + oneTimeCharges

  const getSelectedKiosks = () => {
    const kiosks = []
    if (data.kioskOptions.rearLoad.selected) {
      kiosks.push(`${data.kioskOptions.rearLoad.quantity} Rear Load`)
    }
    if (data.kioskOptions.frontLoad.selected) {
      kiosks.push(`${data.kioskOptions.frontLoad.quantity} Front Load`)
    }
    if (data.kioskOptions.creditBill.selected) {
      kiosks.push(`${data.kioskOptions.creditBill.quantity} EBT`)
    }
    if (data.kioskOptions.creditOnly.selected) {
      kiosks.push(`${data.kioskOptions.creditOnly.quantity} Credit Card Only`)
    }
    return kiosks.length > 0 ? kiosks.join(", ") : "None"
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Revenue Impact Overview - New top section */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
        <CardHeader className="text-center">
          <CardTitle className="text-cyan-700 text-3xl md:text-4xl font-bold">Revenue Impact Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-sm text-gray-600">Owner-Reported Monthly Revenue</div>
            <div className="text-3xl md:text-4xl font-bold">
              {monthlyRevenueBaseline > 0 ? formatCurrency(monthlyRevenueBaseline) : "Not provided"}
            </div>
            {monthlyRevenueBaseline <= 0 && (
              <p className="text-xs text-gray-500 mt-1">Enter monthly revenue in the form to see projections.</p>
            )}
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
              <div className="px-4 py-3 text-center">{formatCurrency(addedAnnualRevenue || 0)}</div>
            </div>
          </div>

          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
            Revenue increase estimates apply primarily to cash and coin-only laundromats transitioning to Laundry Boss.
            Actual results may vary by location and operations.
          </div>

          <Separator />

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
                <p className="text-xs text-gray-600 mt-3">
                  Assumption: Embedded readers reduce wear on coin mechs and external readers. Estimated{" "}
                  {formatCurrency(5500)} per year at 30 machines (~{formatCurrency(perMachineAnnualSavings)} per
                  machine/year). Calculated above for your {totalMachines} machines.
                </p>
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
                  <p className="text-xs font-medium" style={{ color: "#005587" }}>
                    Plus: Mobile app integration, remote monitoring, automated reporting, and 24/7 customer support
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl md:text-4xl">
            {isDistributor
              ? `Distributor Pricing Quote for ${data.prospectName}`
              : `Pricing Quote for ${data.prospectName}`}
          </CardTitle>
          {isDistributor && (
            <p className="text-sm text-blue-600 font-medium">
              Distributor: {data.distributorName} • Special pricing applied: 30% off kiosks, 20% off monthly services
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p>
                <strong>Owner:</strong> {data.ownerName}
              </p>
              <p>
                <strong>Store Size:</strong> {data.storeSize.toLocaleString()} sq ft
              </p>
              <p>
                <strong>Total Machines:</strong> {totalMachines} ({data.numWashers} washers, {data.numDryers} dryers)
              </p>
              <p>
                <strong>Reported Monthly Revenue:</strong>{" "}
                {monthlyRevenueBaseline > 0 ? formatCurrency(monthlyRevenueBaseline) : "Not provided"}
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <strong>Payment Methods:</strong>{" "}
                {[data.acceptsCash && "Cash", data.acceptsCards && "Cards"].filter(Boolean).join(", ") ||
                  "None specified"}
              </p>
              <p>
                <strong>Services:</strong>{" "}
                {[
                  data.hasWashDryFold && `Current WDF (${data.wdfProvider})`,
                  data.wantsWashDryFold && "Laundry Boss Wash Dry Fold",
                  data.wantsPickupDelivery && "Laundry Boss Pickup & Delivery",
                  data.hasAiAttendantWithIntegration && "AI Attendant with Integration",
                  data.hasAiAttendant && !data.hasAiAttendantWithIntegration && "AI Attendant",
                ]
                  .filter(Boolean)
                  .join(", ") || "Self-service only"}
              </p>
              <p>
                <strong>Kiosks:</strong> {getSelectedKiosks()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isDistributor ? (
        // Distributor pricing - single option
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-700">Distributor Total Price</CardTitle>
            <p className="text-sm text-gray-600">One-time payment includes 48 months of service + setup costs</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600 text-lg">Monthly Services (48 months)</CardTitle>
                  <p className="text-sm text-gray-600">20% distributor discount applied</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>
                      Washers ({data.numWashers} × ${(pricingData.monthlyRecurring.washers.price * 0.8).toFixed(2)})
                    </span>
                    <span>{formatCurrency(data.numWashers * pricingData.monthlyRecurring.washers.price * 0.8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Dryers ({data.numDryers} × ${(pricingData.monthlyRecurring.dryers.price * 0.8).toFixed(2)})
                    </span>
                    <span>{formatCurrency(data.numDryers * pricingData.monthlyRecurring.dryers.price * 0.8)}</span>
                  </div>
                  {data.wantsWashDryFold && (
                    <div className="flex justify-between">
                      <span>WDF Software License</span>
                      <span>{formatCurrency(pricingData.monthlyRecurring.wdfSoftware.price * 0.8)}</span>
                    </div>
                  )}
                  {data.wantsPickupDelivery && (
                    <div className="flex justify-between">
                      <span>Pick Up & Delivery License</span>
                      <span>{formatCurrency(pricingData.monthlyRecurring.pickupDelivery.price * 0.8)}</span>
                    </div>
                  )}
                  {data.hasAiAttendantWithIntegration && (
                    <>
                      <div className="flex justify-between">
                        <span>AI Attendant Service</span>
                        <span>{formatCurrency(pricingData.monthlyRecurring.aiAttendant.price * 0.8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Integration Service</span>
                        <span>
                          {formatCurrency(pricingData.monthlyRecurring.aiAttendantWithIntegration.price * 0.8)}
                        </span>
                      </div>
                    </>
                  )}
                  {data.hasAiAttendant && !data.hasAiAttendantWithIntegration && (
                    <div className="flex justify-between">
                      <span>AI Attendant Service</span>
                      <span>{formatCurrency(pricingData.monthlyRecurring.aiAttendant.price * 0.8)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Equipment, Service, and Warranty for 48 months</span>
                    <span className="text-green-600">{formatCurrency(monthlyRecurring * 48)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600 text-lg">One-Time Setup Costs</CardTitle>
                  <p className="text-sm text-gray-600">30% discount on kiosks</p>
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
                  <div className="flex justify-between">
                    <span>Laundry Boss Installation</span>
                    <span>{formatCurrency(installationCost)}</span>
                  </div>
                  {data.kioskOptions.rearLoad.selected && (
                    <div className="flex justify-between">
                      <span>Rear Load Kiosk ({data.kioskOptions.rearLoad.quantity}) - 30% off</span>
                      <span>
                        {formatCurrency(
                          pricingData.kioskOptions.rearLoadKiosk.price * data.kioskOptions.rearLoad.quantity * 0.7,
                        )}
                      </span>
                    </div>
                  )}
                  {data.kioskOptions.frontLoad.selected && (
                    <div className="flex justify-between">
                      <span>Front Load Kiosk ({data.kioskOptions.frontLoad.quantity}) - 30% off</span>
                      <span>
                        {formatCurrency(
                          pricingData.kioskOptions.frontLoadKiosk.price * data.kioskOptions.frontLoad.quantity * 0.7,
                        )}
                      </span>
                    </div>
                  )}
                  {data.kioskOptions.creditBill.selected && (
                    <div className="flex justify-between">
                      <span>EBT Kiosk ({data.kioskOptions.creditBill.quantity}) - 30% off</span>
                      <span>
                        {formatCurrency(
                          pricingData.kioskOptions.creditBillKiosk.price * data.kioskOptions.creditBill.quantity * 0.7,
                        )}
                      </span>
                    </div>
                  )}
                  {data.kioskOptions.creditOnly.selected && (
                    <div className="flex justify-between">
                      <span>Credit Card Only Kiosk ({data.kioskOptions.creditOnly.quantity}) - 30% off</span>
                      <span>
                        {formatCurrency(
                          pricingData.kioskOptions.creditOnlyKiosk.price * data.kioskOptions.creditOnly.quantity * 0.7,
                        )}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Setup Total</span>
                    <span className="text-blue-600">{formatCurrency(oneTimeCharges)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center space-y-4 pt-4">
              <div className="bg-white rounded-lg p-6 border-2 border-purple-200">
                <p className="text-purple-600 font-semibold text-lg mb-2">Total Distributor Price</p>
                <p className="text-5xl font-bold text-purple-600 mb-2">{formatCurrency(distributorTotalPrice)}</p>
                <p className="text-sm text-gray-600">One-time payment • No financing required</p>
                <div className="mt-4 text-sm text-gray-600">
                  <p>Includes: 48 months of service + all setup costs</p>
                  <p>Savings: 30% off kiosks, 20% off monthly services</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Regular customer pricing - three options
        <>
          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
            <CardHeader>
              <CardTitle className="text-cyan-700">Option 1: Total Price</CardTitle>
              <p className="text-sm text-gray-600">One-time payment for complete solution</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700">48 Months of Service & Equipment Warranty</h4>
                  <div className="flex justify-between text-sm">
                    <span>Monthly recurring × 48 months</span>
                    <span>{formatCurrency(monthlyTotal48)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700">One-Time Setup Costs</h4>
                  <div className="flex justify-between text-sm">
                    <span>All setup and installation costs</span>
                    <span>{formatCurrency(oneTimeCharges)}</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="text-center space-y-4">
                <div className="bg-white rounded-lg p-6 border-2 border-cyan-200">
                  <p className="text-cyan-600 font-semibold text-lg mb-2">Total Price</p>
                  <p className="text-5xl font-bold text-cyan-600 mb-2">{formatCurrency(totalPrice)}</p>
                  <p className="text-sm text-gray-600">One-time payment • No monthly fees</p>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>Includes: Complete 48-month solution + all setup costs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
            <CardHeader>
              <CardTitle className="text-blue-700">Option 2: Financed Solution</CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-sm text-gray-600">Finance all costs over 48 months</p>
                <div className="flex items-center gap-2">
                  <Label htmlFor="interestRate" className="text-sm">
                    Interest Rate:
                  </Label>
                  <Input
                    id="interestRate"
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value) || 9)}
                    className="w-20 h-8"
                  />
                  <span className="text-sm">% APR</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main financing result - always visible */}
              <div className="text-center space-y-4">
                <div>
                  <p className="text-blue-600 font-semibold text-lg">Financed Monthly Payment</p>
                  <p className="text-4xl font-bold text-blue-600">{formatCurrency(financedMonthlyPayment)}</p>
                  <p className="text-sm text-gray-600">per month for 48 months at {interestRate}% APR</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p>
                      <strong>Total of payments:</strong> {formatCurrency(financedMonthlyPayment * 48)}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Total interest:</strong> {formatCurrency(financedMonthlyPayment * 48 - totalToFinance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expandable details section */}
              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowFinanceDetails(!showFinanceDetails)}
                  className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700"
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
                                  This is the current worth of your future monthly payments. Since money today is worth
                                  more than money in the future (due to inflation and opportunity cost), we discount
                                  future payments to their present value using a 12.5% annual discount rate. This
                                  creates savings compared to paying the full monthly amount over 48 months.
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
                          <span>{formatCurrency(oneTimeCharges)}</span>
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

          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold">Option 3: Monthly Payment Plan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
                  <div>
                    <p className="text-green-600 font-semibold">Monthly Recurring</p>
                    <p className="text-sm text-gray-600">(48-month contract)</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(monthlyRecurring)}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-semibold">One-Time Setup</p>
                    <p className="text-sm text-gray-600">(Upfront payment)</p>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(oneTimeCharges)}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Laundry Boss Guarantees an increase in your store revenue of 8% within the first 6 months for all
                  customers, who did not previously implement a card system, or you can cancel with no additional
                  impact.
                </p>
                <div className="pt-4">
                  <p className="text-xs text-gray-500">
                    This quote is valid for 30 days and subject to final site survey.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
              <CardHeader>
                <CardTitle className="text-green-600">Monthly Recurring Fees</CardTitle>
                <p className="text-sm text-gray-600">Based on 48-month contract</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Washers ({data.numWashers} × $5.00)</span>
                  <span>{formatCurrency(data.numWashers * 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dryers ({data.numDryers} × $5.00)</span>
                  <span>{formatCurrency(data.numDryers * 5)}</span>
                </div>
                {data.wantsWashDryFold && (
                  <div className="flex justify-between">
                    <span>WDF Software License</span>
                    <span>{formatCurrency(100)}</span>
                  </div>
                )}
                {data.wantsPickupDelivery && (
                  <div className="flex justify-between">
                    <span>Pick Up & Delivery License</span>
                    <span>{formatCurrency(100)}</span>
                  </div>
                )}
                {data.hasAiAttendantWithIntegration && (
                  <>
                    <div className="flex justify-between">
                      <span>AI Attendant Service</span>
                      <span>{formatCurrency(49.99)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI Integration Service</span>
                      <span>{formatCurrency(50.0)}</span>
                    </div>
                  </>
                )}
                {data.hasAiAttendant && !data.hasAiAttendantWithIntegration && (
                  <div className="flex justify-between">
                    <span>AI Attendant Service</span>
                    <span>{formatCurrency(49.99)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Monthly Total</span>
                  <span className="text-green-600">{formatCurrency(monthlyRecurring)}</span>
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
                {posSystemCost > 0 && (
                  <div className="flex justify-between">
                    <span>Laundry Boss Point of Sale System</span>
                    <span>{formatCurrency(posSystemCost)}</span>
                  </div>
                )}
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
                <div className="flex justify-between">
                  <span>Laundry Boss Installation</span>
                  <span>{formatCurrency(installationCost)}</span>
                </div>
                {data.selfInstall && (
                  <div className="text-xs text-gray-500 -mt-2 ml-4">Self-install with assistance</div>
                )}
                {!data.selfInstall && (
                  <div className="text-xs text-gray-500 -mt-2 ml-4">
                    Full installation service ({totalMachines} machines)
                  </div>
                )}
                {data.kioskOptions.rearLoad.selected && (
                  <div className="flex justify-between">
                    <span>Rear Load Kiosk ({data.kioskOptions.rearLoad.quantity})</span>
                    <span>
                      {formatCurrency(
                        pricingData.kioskOptions.rearLoadKiosk.price * data.kioskOptions.rearLoad.quantity,
                      )}
                    </span>
                  </div>
                )}
                {data.kioskOptions.frontLoad.selected && (
                  <div className="flex justify-between">
                    <span>Front Load Kiosk ({data.kioskOptions.frontLoad.quantity})</span>
                    <span>
                      {formatCurrency(
                        pricingData.kioskOptions.frontLoadKiosk.price * data.kioskOptions.frontLoad.quantity,
                      )}
                    </span>
                  </div>
                )}
                {data.kioskOptions.creditBill.selected && (
                  <div className="flex justify-between">
                    <span>EBT Kiosk ({data.kioskOptions.creditBill.quantity})</span>
                    <span>
                      {formatCurrency(
                        pricingData.kioskOptions.creditBillKiosk.price * data.kioskOptions.creditBill.quantity,
                      )}
                    </span>
                  </div>
                )}
                {data.kioskOptions.creditOnly.selected && (
                  <div className="flex justify-between">
                    <span>Credit Card Only Kiosk ({data.kioskOptions.creditOnly.quantity})</span>
                    <span>
                      {formatCurrency(
                        pricingData.kioskOptions.creditOnlyKiosk.price * data.kioskOptions.creditOnly.quantity,
                      )}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>One-Time Total</span>
                  <span className="text-blue-600">{formatCurrency(oneTimeCharges)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {data.additionalNotes && (
        <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{data.additionalNotes}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center space-x-4">
        <Button onClick={onBack} variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-700">
          Back to Edit Information
        </Button>
        <Button onClick={onNewQuote} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
          New Quote
        </Button>
        <Button onClick={() => window.print()} className="bg-green-50 border-green-200 text-green-700">
          Print Quote
        </Button>
      </div>
    </div>
  )
}
