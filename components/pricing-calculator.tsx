"use client"
import { useState } from "react"
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
  const [showDistributorDetails, setShowDistributorDetails] = useState(false)
  const [showCleanShowDetails, setShowCleanShowDetails] = useState(false)
  const [showOption3Details, setShowOption3Details] = useState(false)

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

  const calculatePricing = (applySpecialDiscount = false) => {
    let monthlyRecurring = 0
    let oneTimeCharges = 0

    // Monthly recurring fees
    let washerPrice = pricingData.monthlyRecurring.washers.price
    let dryerPrice = pricingData.monthlyRecurring.dryers.price
    let wdfPrice = pricingData.monthlyRecurring.wdfSoftware.price
    let pickupPrice = pricingData.monthlyRecurring.pickupDelivery.price
    let aiAttendantPrice = pricingData.monthlyRecurring.aiAttendant.price
    let aiIntegrationPrice = pricingData.monthlyRecurring.aiAttendantWithIntegration.price

    // Apply 20% discount to monthly services for distributors or Clean Show 2025 special pricing
    if (isDistributor || applySpecialDiscount) {
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

    // Kiosk options with 30% discount for distributors or Clean Show 2025 special pricing
    const kioskDiscount = isDistributor || applySpecialDiscount ? 0.7 : 1.0

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

  const cleanShowPricing = calculatePricing(true)

  // Option calculations (only for non-distributors)
  const monthlyTotal48 = monthlyRecurring * 48 // Gross total over 48 months
  const monthlyPV = calculatePresentValue(monthlyRecurring) // Present value of monthly payments
  const totalToFinance = monthlyPV + oneTimeCharges // PV + one-time costs
  const financedMonthlyPayment = calculateLoanPayment(totalToFinance, interestRate, 48) // Finance over 48 months

  // Option 1: Total price (monthly × 48 + one-time)
  const totalPrice = monthlyTotal48 + oneTimeCharges

  // Distributor total price (monthly × 48 + one-time)
  const distributorTotalPrice = monthlyRecurring * 48 + oneTimeCharges

  const cleanShowTotalPrice = cleanShowPricing.monthlyRecurring * 48 + cleanShowPricing.oneTimeCharges

  const getSelectedKiosks = () => {
    const kiosks = []
    if (data.kioskOptions.rearLoad.selected) {
      kiosks.push(`${data.kioskOptions.rearLoad.quantity} Rear Load`)
    }
    if (data.kioskOptions.frontLoad.selected) {
      kiosks.push(`${data.kioskOptions.frontLoad.quantity} Front Load`)
    }
    if (data.kioskOptions.creditBill.selected) {
      kiosks.push(`${data.kioskOptions.creditBill.quantity} Credit Bill`)
    }
    if (data.kioskOptions.creditOnly.selected) {
      kiosks.push(`${data.kioskOptions.creditOnly.quantity} Credit Only`)
    }
    return kiosks
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-900">Your Laundry Boss Quote</h2>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Customer:</strong> {data.ownerName} | <strong>Business:</strong> {data.prospectName}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Email:</strong> {data.customerEmail} | <strong>Phone:</strong> {data.customerPhone}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Configuration:</strong> {data.numWashers} Washers, {data.numDryers} Dryers
            {data.wantsWashDryFold && " | Wash-Dry-Fold"}
            {data.wantsPickupDelivery && " | Pickup & Delivery"}
            {getSelectedKiosks().length > 0 && ` | Kiosks: ${getSelectedKiosks().join(", ")}`}
          </p>
        </div>
      </div>

      {/* Revenue Projections */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-green-800 mb-6">📈 Revenue Growth Projections</h3>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="font-medium text-green-700 mb-4">Current Revenue</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Weekly: {formatCurrency(monthlyRevenueBaseline / weeksPerMonth)}</p>
              <p className="text-sm text-gray-600">Monthly: {formatCurrency(monthlyRevenueBaseline)}</p>
              <p className="text-sm text-gray-600">Annual: {formatCurrency(monthlyRevenueBaseline * 12)}</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="font-medium text-green-700 mb-4">Projected with Laundry Boss</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Weekly: {formatCurrency(projectedWeeklyAfterLB)}</p>
              <p className="text-sm text-gray-600">Monthly: {formatCurrency(projectedMonthlyAfterLB)}</p>
              <p className="text-sm text-gray-600">Annual: {formatCurrency(projectedAnnualAfterLB)}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-green-100 border border-green-300 rounded-lg p-6">
            <h4 className="font-semibold text-green-800 mb-3">💰 Additional Revenue</h4>
            <div className="space-y-2">
              <p className="text-green-800 font-medium">{formatCurrency(addedWeeklyRevenue)}/week</p>
              <p className="text-green-800 font-medium">{formatCurrency(addedMonthlyRevenue)}/month</p>
              <p className="text-green-800 font-medium">{formatCurrency(addedAnnualRevenue)}/year</p>
            </div>
            <p className="text-xs text-green-700 mt-3">Based on 15.3% average increase in first ~90 days</p>
          </div>
          <div className="bg-green-100 border border-green-300 rounded-lg p-6">
            <h4 className="font-semibold text-green-800 mb-3">🔧 Operational Savings</h4>
            <div className="space-y-2">
              <p className="text-green-800 font-medium">{formatCurrency(weeklyOperationalSavings)}/week</p>
              <p className="text-green-800 font-medium">{formatCurrency(monthlyOperationalSavings)}/month</p>
              <p className="text-green-800 font-medium">{formatCurrency(annualOperationalSavings)}/year</p>
            </div>
            <p className="text-xs text-green-700 mt-3">
              Reduced wear and tear from embedded readers. Laundry Boss systems typically reduce maintenance costs and
              extend equipment life through smart monitoring and preventive alerts.
            </p>
          </div>
        </div>

        <div className="mt-6 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg">
          <h4 className="text-xl font-semibold text-cyan-800 mb-4">Revenue Impact Overview</h4>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Owner-Reported Monthly Revenue</div>
            <div className="text-2xl font-bold mb-4">
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
              <div className="grid grid-cols-3 text-sm bg-cyan-50 font-semibold">
                <div className="px-4 py-3">Annual Revenue After LB</div>
                <div className="px-4 py-3 text-center">—</div>
                <div className="px-4 py-3 text-center">{formatCurrency(projectedAnnualAfterLB || 0)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-200 rounded-lg">
          <h5 className="font-semibold text-green-800 mb-2">Why Laundry Boss is a Perfect Fit:</h5>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Proven track record of 15.3% average revenue increase</li>
            <li>• Smart monitoring reduces equipment downtime</li>
            <li>• Enhanced customer experience drives repeat business</li>
            <li>• Real-time analytics help optimize operations</li>
          </ul>
        </div>
      </div>

      {/* Pricing Options */}
      <div className="space-y-6">
        {!isDistributor && (
          <>
            {/* Option 1: Total Price */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Option 1: Total Price</h3>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalPrice)}</p>
                  <p className="text-sm text-gray-500">One-time payment</p>
                </div>
              </div>
              <p className="text-gray-600">Pay the full amount upfront and own your Laundry Boss system immediately.</p>
            </div>

            {/* Option 2: Financed Solution */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Option 2: Financed Solution</h3>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(financedMonthlyPayment)}</p>
                  <p className="text-sm text-gray-500">per month for 48 months</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-gray-600">Finance your Laundry Boss system with our competitive rates.</p>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">What's Being Financed:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Present Value of Monthly Services (48 months)</span>
                      <span>{formatCurrency(monthlyPV)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>One-Time Setup Charges</span>
                      <span>{formatCurrency(oneTimeCharges)}</span>
                    </div>
                    <div className="border-t pt-2 font-semibold flex justify-between">
                      <span>Total Amount Financed</span>
                      <span>{formatCurrency(totalToFinance)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Interest Rate:</label>
                  <input
                    type="range"
                    min="6"
                    max="15"
                    step="0.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-900">{interestRate}%</span>
                </div>

                <button
                  onClick={() => setShowFinanceDetails(!showFinanceDetails)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showFinanceDetails ? "Hide" : "Show"} Financing Details
                </button>
                {showFinanceDetails && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
                    <div className="space-y-2">
                      <p>
                        <strong>Amount to Finance:</strong> {formatCurrency(totalToFinance)}
                      </p>
                      <p>
                        <strong>Interest Rate:</strong> {interestRate}%
                      </p>
                      <p>
                        <strong>Term:</strong> 48 months
                      </p>
                      <p>
                        <strong>Monthly Payment:</strong> {formatCurrency(financedMonthlyPayment)}
                      </p>
                      <p>
                        <strong>Total of Payments:</strong> {formatCurrency(financedMonthlyPayment * 48)}
                      </p>
                      <p>
                        <strong>Total Interest:</strong> {formatCurrency(financedMonthlyPayment * 48 - totalToFinance)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Option 3: Monthly Payment Plan */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Option 3: Monthly Payment Plan</h3>
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-600">{formatCurrency(monthlyRecurring)}</p>
                  <p className="text-sm text-gray-500">per month + one-time setup</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Low monthly payments with our comprehensive service package. Perfect for cash flow management.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-4">
                {/* Monthly Recurring Fees */}
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-3">Monthly Recurring Fees</h4>
                  <p className="text-sm text-gray-600 mb-2">Based on 48-month contract</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>
                        Washers ({data.numWashers} × {formatCurrency(pricingData.monthlyRecurring.washers.price)})
                      </span>
                      <span>{formatCurrency(data.numWashers * pricingData.monthlyRecurring.washers.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        Dryers ({data.numDryers} × {formatCurrency(pricingData.monthlyRecurring.dryers.price)})
                      </span>
                      <span>{formatCurrency(data.numDryers * pricingData.monthlyRecurring.dryers.price)}</span>
                    </div>
                    {data.wantsWashDryFold && (
                      <div className="flex justify-between">
                        <span>WDF Software License</span>
                        <span>{formatCurrency(pricingData.monthlyRecurring.wdfSoftware.price)}</span>
                      </div>
                    )}
                    {data.wantsPickupDelivery && (
                      <div className="flex justify-between">
                        <span>Pick Up & Delivery License</span>
                        <span>{formatCurrency(pricingData.monthlyRecurring.pickupDelivery.price)}</span>
                      </div>
                    )}
                    {data.hasAiAttendantWithIntegration && (
                      <>
                        <div className="flex justify-between">
                          <span>AI Attendant Service</span>
                          <span>{formatCurrency(pricingData.monthlyRecurring.aiAttendant.price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>AI Integration Service</span>
                          <span>{formatCurrency(pricingData.monthlyRecurring.aiAttendantWithIntegration.price)}</span>
                        </div>
                      </>
                    )}
                    {data.hasAiAttendant && !data.hasAiAttendantWithIntegration && (
                      <div className="flex justify-between">
                        <span>AI Attendant Service</span>
                        <span>{formatCurrency(pricingData.monthlyRecurring.aiAttendant.price)}</span>
                      </div>
                    )}
                    <div className="border-t pt-1 font-semibold flex justify-between">
                      <span>Monthly Total</span>
                      <span>{formatCurrency(monthlyRecurring)}</span>
                    </div>
                  </div>
                </div>

                {/* One-Time Charges */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">One-Time Charges</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Harnesses ({data.numWashers + data.numDryers} × $25.00)</span>
                      <span>{formatCurrency((data.numWashers + data.numDryers) * 25)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        QR Codes ({qrCodeInfo.quantity} × {formatCurrency(qrCodeInfo.pricePerCode)})
                      </span>
                      <span>{formatCurrency(qrCodeInfo.totalCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sign Package</span>
                      <span>{formatCurrency(pricingData.oneTimeCharges.signPackage.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Matterport 3D Scan</span>
                      <span>{formatCurrency(pricingData.oneTimeCharges.matterport3D.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FULL Network Package</span>
                      <span>{formatCurrency(pricingData.oneTimeCharges.fullNetworkPackage.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laundry Boss Point of Sale System</span>
                      <span>{formatCurrency(posSystemCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laundry Boss Installation</span>
                      <span>{formatCurrency(installationCost)}</span>
                    </div>
                    {data.selfInstall && (
                      <p className="text-xs text-green-600 italic">
                        Self-install with assistance ({data.numWashers + data.numDryers} machines)
                      </p>
                    )}
                    {!data.selfInstall && (
                      <p className="text-xs text-green-600 italic">
                        Full installation service ({data.numWashers + data.numDryers} machines)
                      </p>
                    )}
                    {getSelectedKiosks().length > 0 && (
                      <div className="space-y-1">
                        {data.kioskOptions.rearLoad.selected && (
                          <div className="flex justify-between">
                            <span>Rear Load Kiosks ({data.kioskOptions.rearLoad.quantity})</span>
                            <span>
                              {formatCurrency(
                                pricingData.kioskOptions.rearLoadKiosk.price * data.kioskOptions.rearLoad.quantity,
                              )}
                            </span>
                          </div>
                        )}
                        {data.kioskOptions.frontLoad.selected && (
                          <div className="flex justify-between">
                            <span>Front Load Kiosks ({data.kioskOptions.frontLoad.quantity})</span>
                            <span>
                              {formatCurrency(
                                pricingData.kioskOptions.frontLoadKiosk.price * data.kioskOptions.frontLoad.quantity,
                              )}
                            </span>
                          </div>
                        )}
                        {data.kioskOptions.creditBill.selected && (
                          <div className="flex justify-between">
                            <span>Credit Bill Kiosks ({data.kioskOptions.creditBill.quantity})</span>
                            <span>
                              {formatCurrency(
                                pricingData.kioskOptions.creditBillKiosk.price * data.kioskOptions.creditBill.quantity,
                              )}
                            </span>
                          </div>
                        )}
                        {data.kioskOptions.creditOnly.selected && (
                          <div className="flex justify-between">
                            <span>Credit Only Kiosks ({data.kioskOptions.creditOnly.quantity})</span>
                            <span>
                              {formatCurrency(
                                pricingData.kioskOptions.creditOnlyKiosk.price * data.kioskOptions.creditOnly.quantity,
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="border-t pt-1 font-semibold flex justify-between">
                      <span>One-Time Total</span>
                      <span>{formatCurrency(oneTimeCharges)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowOption3Details(!showOption3Details)}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                {showOption3Details ? "Hide" : "Show"} Pricing Details
              </button>
              {showOption3Details && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg text-sm">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-purple-800 mb-2">Monthly Services</h5>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Washers ({data.numWashers})</span>
                          <span>{formatCurrency(data.numWashers * pricingData.monthlyRecurring.washers.price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dryers ({data.numDryers})</span>
                          <span>{formatCurrency(data.numDryers * pricingData.monthlyRecurring.dryers.price)}</span>
                        </div>
                        {data.wantsWashDryFold && (
                          <div className="flex justify-between">
                            <span>WDF Software</span>
                            <span>{formatCurrency(pricingData.monthlyRecurring.wdfSoftware.price)}</span>
                          </div>
                        )}
                        {data.wantsPickupDelivery && (
                          <div className="flex justify-between">
                            <span>Pickup & Delivery</span>
                            <span>{formatCurrency(pricingData.monthlyRecurring.pickupDelivery.price)}</span>
                          </div>
                        )}
                        {data.hasAiAttendant && (
                          <div className="flex justify-between">
                            <span>AI Attendant</span>
                            <span>{formatCurrency(pricingData.monthlyRecurring.aiAttendant.price)}</span>
                          </div>
                        )}
                        {data.hasAiAttendantWithIntegration && (
                          <div className="flex justify-between">
                            <span>AI Integration</span>
                            <span>{formatCurrency(pricingData.monthlyRecurring.aiAttendantWithIntegration.price)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-purple-800 mb-2">One-Time Charges</h5>
                      <div className="space-y-1">
                        <div className="text-xs">
                          Harnesses: {formatCurrency((data.numWashers + data.numDryers) * 25)}
                        </div>
                        <div className="text-xs">QR Codes: {formatCurrency(qrCodeInfo.totalCost)}</div>
                        <div className="text-xs">Installation: {formatCurrency(installationCost)}</div>
                        <div className="text-xs">
                          Network Package: {formatCurrency(pricingData.oneTimeCharges.fullNetworkPackage.price)}
                        </div>
                        {posSystemCost > 0 && (
                          <div className="text-xs">POS System: {formatCurrency(posSystemCost)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-purple-100 rounded">
                    <p className="text-purple-800 font-medium">💰 Total System Cost: {formatCurrency(totalPrice)}</p>
                    <p className="text-xs text-purple-700">
                      Monthly: {formatCurrency(monthlyRecurring * 48)} | One-time: {formatCurrency(oneTimeCharges)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Distributor Pricing */}
        {isDistributor && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-orange-800">🏆 Distributor Pricing</h3>
                <p className="text-sm text-orange-600">Exclusive pricing for {data.distributorName}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(distributorTotalPrice)}</p>
                <p className="text-sm text-gray-500">Total system cost</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700">
                Special distributor pricing with 20% discount on monthly services and 30% discount on kiosks.
              </p>
              <button
                onClick={() => setShowDistributorDetails(!showDistributorDetails)}
                className="text-orange-600 hover:text-orange-800 text-sm font-medium"
              >
                {showDistributorDetails ? "Hide" : "Show"} Pricing Details
              </button>
              {showDistributorDetails && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg text-sm">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-orange-800 mb-2">Monthly Services (20% Discount)</h5>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>
                            Washers: {formatCurrency(pricingData.monthlyRecurring.washers.price)} →{" "}
                            {formatCurrency(pricingData.monthlyRecurring.washers.price * 0.8)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>
                            Dryers: {formatCurrency(pricingData.monthlyRecurring.dryers.price)} →{" "}
                            {formatCurrency(pricingData.monthlyRecurring.dryers.price * 0.8)}
                          </span>
                        </div>
                        {data.wantsWashDryFold && (
                          <div className="flex justify-between">
                            <span>
                              WDF: {formatCurrency(pricingData.monthlyRecurring.wdfSoftware.price)} →{" "}
                              {formatCurrency(pricingData.monthlyRecurring.wdfSoftware.price * 0.8)}
                            </span>
                          </div>
                        )}
                        {data.wantsPickupDelivery && (
                          <div className="flex justify-between">
                            <span>
                              P&D: {formatCurrency(pricingData.monthlyRecurring.pickupDelivery.price)} →{" "}
                              {formatCurrency(pricingData.monthlyRecurring.pickupDelivery.price * 0.8)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-orange-800 mb-2">Kiosk Pricing (30% Discount)</h5>
                      <div className="space-y-1">
                        {getSelectedKiosks().length > 0 ? (
                          <>
                            {data.kioskOptions.rearLoad.selected && (
                              <div className="text-xs">
                                Rear Load: {formatCurrency(pricingData.kioskOptions.rearLoadKiosk.price)} →{" "}
                                {formatCurrency(pricingData.kioskOptions.rearLoadKiosk.price * 0.7)}
                              </div>
                            )}
                            {data.kioskOptions.frontLoad.selected && (
                              <div className="text-xs">
                                Front Load: {formatCurrency(pricingData.kioskOptions.frontLoadKiosk.price)} →{" "}
                                {formatCurrency(pricingData.kioskOptions.frontLoadKiosk.price * 0.7)}
                              </div>
                            )}
                            {data.kioskOptions.creditBill.selected && (
                              <div className="text-xs">
                                Credit Bill: {formatCurrency(pricingData.kioskOptions.creditBillKiosk.price)} →{" "}
                                {formatCurrency(pricingData.kioskOptions.creditBillKiosk.price * 0.7)}
                              </div>
                            )}
                            {data.kioskOptions.creditOnly.selected && (
                              <div className="text-xs">
                                Credit Only: {formatCurrency(pricingData.kioskOptions.creditOnlyKiosk.price)} →{" "}
                                {formatCurrency(pricingData.kioskOptions.creditOnlyKiosk.price * 0.7)}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">No kiosks selected</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-orange-100 rounded">
                    <p className="text-orange-800 font-medium">
                      💰 Total Savings: {formatCurrency(totalPrice - distributorTotalPrice)}
                    </p>
                    <p className="text-xs text-orange-700">
                      Monthly: {formatCurrency(monthlyRecurring * 48)} → {formatCurrency(monthlyRecurring * 48)} |
                      One-time: {formatCurrency(oneTimeCharges)} → {formatCurrency(oneTimeCharges)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Option 4: Clean Show 2025 Special Pricing (for non-distributors only) */}
        {!isDistributor && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-purple-800">🎉 Option 4: Clean Show 2025 Special Pricing</h3>
                <p className="text-sm text-purple-600">Limited-time exclusive offer</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(cleanShowTotalPrice)}</p>
                <p className="text-sm text-gray-500">Total system cost</p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-gray-700">
                Get the same exclusive pricing as our distributors! 20% discount on monthly services and 30% discount on
                kiosks.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Monthly Services with Clean Show Pricing */}
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-3">Monthly Services (20% Discount)</h4>
                  <p className="text-sm text-gray-600 mb-2">Based on 48-month contract</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>
                        Washers ({data.numWashers} × {formatCurrency(pricingData.monthlyRecurring.washers.price * 0.8)})
                      </span>
                      <span>{formatCurrency(data.numWashers * pricingData.monthlyRecurring.washers.price * 0.8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        Dryers ({data.numDryers} × {formatCurrency(pricingData.monthlyRecurring.dryers.price * 0.8)})
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
                    <div className="border-t pt-1 font-semibold flex justify-between">
                      <span>Monthly Total</span>
                      <span>{formatCurrency(cleanShowPricing.monthlyRecurring)}</span>
                    </div>
                  </div>
                </div>

                {/* One-Time Charges with Clean Show Pricing */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">One-Time Charges</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>
                        QR Codes ({qrCodeInfo.quantity} × {formatCurrency(qrCodeInfo.pricePerCode)})
                      </span>
                      <span>{formatCurrency(qrCodeInfo.totalCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sign Package</span>
                      <span>{formatCurrency(pricingData.oneTimeCharges.signPackage.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Matterport 3D Scan</span>
                      <span>{formatCurrency(pricingData.oneTimeCharges.matterport3D.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FULL Network Package</span>
                      <span>{formatCurrency(pricingData.oneTimeCharges.fullNetworkPackage.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laundry Boss Point of Sale System</span>
                      <span>{formatCurrency(posSystemCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laundry Boss Installation</span>
                      <span>{formatCurrency(installationCost)}</span>
                    </div>
                    {data.selfInstall && (
                      <p className="text-xs text-green-600 italic">
                        Full installation service ({data.numWashers + data.numDryers} machines)
                      </p>
                    )}
                    {getSelectedKiosks().length > 0 && (
                      <div className="space-y-1">
                        {data.kioskOptions.rearLoad.selected && (
                          <div className="flex justify-between">
                            <span>Rear Load Kiosks ({data.kioskOptions.rearLoad.quantity}) - 30% off</span>
                            <span>
                              {formatCurrency(
                                pricingData.kioskOptions.rearLoadKiosk.price *
                                  data.kioskOptions.rearLoad.quantity *
                                  0.7,
                              )}
                            </span>
                          </div>
                        )}
                        {data.kioskOptions.frontLoad.selected && (
                          <div className="flex justify-between">
                            <span>Front Load Kiosks ({data.kioskOptions.frontLoad.quantity}) - 30% off</span>
                            <span>
                              {formatCurrency(
                                pricingData.kioskOptions.frontLoadKiosk.price *
                                  data.kioskOptions.frontLoad.quantity *
                                  0.7,
                              )}
                            </span>
                          </div>
                        )}
                        {data.kioskOptions.creditBill.selected && (
                          <div className="flex justify-between">
                            <span>Credit Bill Kiosks ({data.kioskOptions.creditBill.quantity}) - 30% off</span>
                            <span>
                              {formatCurrency(
                                pricingData.kioskOptions.creditBillKiosk.price *
                                  data.kioskOptions.creditBill.quantity *
                                  0.7,
                              )}
                            </span>
                          </div>
                        )}
                        {data.kioskOptions.creditOnly.selected && (
                          <div className="flex justify-between">
                            <span>Credit Only Kiosks ({data.kioskOptions.creditOnly.quantity}) - 30% off</span>
                            <span>
                              {formatCurrency(
                                pricingData.kioskOptions.creditOnlyKiosk.price *
                                  data.kioskOptions.creditOnly.quantity *
                                  0.7,
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="border-t pt-1 font-semibold flex justify-between">
                      <span>One-Time Total</span>
                      <span>{formatCurrency(cleanShowPricing.oneTimeCharges)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-purple-100 rounded">
                <p className="text-purple-800 font-medium">
                  💰 Total Savings: {formatCurrency(totalPrice - cleanShowTotalPrice)}
                </p>
                <p className="text-xs text-purple-700">Same great pricing as our distributors - limited time offer!</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Additional Notes</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• All monthly pricing is based on a 48-month contract term</li>
          <li>• Installation includes full setup and training for your team</li>
          <li>• 24/7 technical support and maintenance included</li>
          <li>• Revenue projections based on Laundry Boss average performance data</li>
          <li>• Financing options available with approved credit</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back to Questions
        </button>
        <button
          onClick={onNewQuote}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate New Quote
        </button>
      </div>
    </div>
  )
}
