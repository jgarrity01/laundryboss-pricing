"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

function formatCurrency0(n: number) {
  if (!n || Number.isNaN(n)) return ""
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function parseCurrencyString(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, "")
  if (!cleaned) return 0
  // Handle cases with multiple dots by keeping the first
  const parts = cleaned.split(".")
  const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned
  const num = Number(normalized)
  return Number.isFinite(num) ? num : 0
}

export interface QuestionnaireData {
  prospectName: string
  ownerName: string
  distributorName: string
  storeSize: number
  numWashers: number
  numDryers: number
  acceptsCash: boolean
  acceptsCards: boolean
  hasWashDryFold: boolean
  wdfProvider: string
  wdfOtherProvider?: string // New: separate field for WDF "Other"
  wantsWashDryFold: boolean
  wantsPickupDelivery: boolean
  hasPaymentVendor: boolean
  currentVendor: string
  currentVendorOther?: string // New: for payment vendor "Other"
  selfInstall: boolean
  hasAiAttendant: boolean
  hasAiAttendantWithIntegration: boolean
  kioskOptions: {
    rearLoad: { selected: boolean; quantity: number }
    frontLoad: { selected: boolean; quantity: number }
    creditBill: { selected: boolean; quantity: number }
    creditOnly: { selected: boolean; quantity: number }
  }
  additionalNotes: string
  monthlyRevenue: number // Owner-reported current monthly revenue (numeric)
  expectedCloseDate?: string
}

interface QuestionnaireProps {
  onComplete: (data: QuestionnaireData) => void
  initialData?: QuestionnaireData | null
}

export function Questionnaire({ onComplete, initialData }: QuestionnaireProps) {
  const [formData, setFormData] = useState<QuestionnaireData>(
    initialData || {
      prospectName: "",
      ownerName: "",
      distributorName: "",
      storeSize: 0,
      numWashers: 0,
      numDryers: 0,
      acceptsCash: false,
      acceptsCards: false,
      hasWashDryFold: false,
      wdfProvider: "",
      wdfOtherProvider: "",
      wantsWashDryFold: false,
      wantsPickupDelivery: false,
      hasPaymentVendor: false,
      currentVendor: "",
      currentVendorOther: "",
      selfInstall: false,
      hasAiAttendant: false,
      hasAiAttendantWithIntegration: false,
      kioskOptions: {
        rearLoad: { selected: false, quantity: 0 },
        frontLoad: { selected: false, quantity: 0 },
        creditBill: { selected: false, quantity: 0 },
        creditOnly: { selected: false, quantity: 0 },
      },
      additionalNotes: "",
      monthlyRevenue: 0,
      expectedCloseDate: "",
    },
  )

  // Local display state for currency-formatted monthly revenue
  const [monthlyRevenueDisplay, setMonthlyRevenueDisplay] = useState<string>(
    initialData && initialData.monthlyRevenue ? formatCurrency0(initialData.monthlyRevenue) : "",
  )

  // Auto-suggest kiosk configuration based on store characteristics
  useEffect(() => {
    if (formData.storeSize > 0) {
      const suggestions = getKioskSuggestions(formData.storeSize, formData.acceptsCash, formData.acceptsCards)

      setFormData((prev) => ({
        ...prev,
        kioskOptions: {
          rearLoad: suggestions.rearLoad,
          frontLoad: suggestions.frontLoad,
          creditBill: suggestions.creditBill,
          creditOnly: suggestions.creditOnly,
        },
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.storeSize, formData.acceptsCash, formData.acceptsCards])

  const getKioskSuggestions = (storeSize: number, acceptsCash: boolean, acceptsCards: boolean) => {
    const suggestions = {
      rearLoad: { selected: false, quantity: 0 },
      frontLoad: { selected: false, quantity: 0 },
      creditBill: { selected: false, quantity: 0 },
      creditOnly: { selected: false, quantity: 0 },
    }

    if (acceptsCash) {
      if (storeSize < 1500) {
        // Small store with cash - 1 Rear Load
        suggestions.rearLoad = { selected: true, quantity: 1 }
      } else if (storeSize < 3000) {
        // Medium store with cash - 1 Rear Load + 1 Credit Only
        suggestions.rearLoad = { selected: true, quantity: 1 }
        suggestions.creditOnly = { selected: true, quantity: 1 }
      } else if (storeSize < 5000) {
        // Large store with cash - 2 Rear Load + 2 Credit Only
        suggestions.rearLoad = { selected: true, quantity: 2 }
        suggestions.creditOnly = { selected: true, quantity: 2 }
      } else {
        // Very large store - 2 Rear Load + 3 Credit Only
        suggestions.rearLoad = { selected: true, quantity: 2 }
        suggestions.creditOnly = { selected: true, quantity: 3 }
      }
    } else if (acceptsCards && !acceptsCash) {
      // Card-only stores
      if (storeSize < 2000) {
        suggestions.creditOnly = { selected: true, quantity: 1 }
      } else if (storeSize < 4000) {
        suggestions.creditOnly = { selected: true, quantity: 2 }
      } else {
        suggestions.creditOnly = { selected: true, quantity: 3 }
      }
    }

    return suggestions
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Normalize vendor fields for submission
    const normalized: QuestionnaireData = {
      ...formData,
      // If WDF provider is "Other", keep both values; the calculator currently only shows the wdfProvider label.
      // If payment vendor is "Other", fold the typed value into currentVendor for downstream usage.
      currentVendor:
        formData.currentVendor === "Other" ? formData.currentVendorOther?.trim() || "Other" : formData.currentVendor,
    }
    onComplete(normalized)
  }

  const paymentVendors = [
    "Laundry Boss",
    "PayRange",
    "Laundroworks",
    "Cents",
    "SpyderWash",
    "ESD",
    "CCI",
    "DexterPay",
    "BubblePay",
    "TangerPay",
    "Nayax",
    "ShinePay",
    "Kiosoft",
    "Other",
  ]

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Laundromat Information</CardTitle>
          <CardDescription>
            Please provide details about your laundromat to generate a customized pricing quote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prospectName">Business Name</Label>
                <Input
                  id="prospectName"
                  value={formData.prospectName}
                  onChange={(e) => setFormData({ ...formData, prospectName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distributorName">Distributor Name (Optional)</Label>
              <Input
                id="distributorName"
                value={formData.distributorName}
                onChange={(e) => setFormData({ ...formData, distributorName: e.target.value })}
                placeholder="Please fill in if you are a distributor"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeSize">Store Size (Square Feet)</Label>
                <Input
                  id="storeSize"
                  type="number"
                  value={formData.storeSize || ""}
                  onChange={(e) => setFormData({ ...formData, storeSize: Number.parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numWashers">Number of Washers</Label>
                <Input
                  id="numWashers"
                  type="number"
                  value={formData.numWashers || ""}
                  onChange={(e) => setFormData({ ...formData, numWashers: Number.parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numDryers">Number of Dryers</Label>
                <Input
                  id="numDryers"
                  type="number"
                  value={formData.numDryers || ""}
                  onChange={(e) => setFormData({ ...formData, numDryers: Number.parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedCloseDate">Expected Close Date (optional)</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={formData.expectedCloseDate || ""}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              />
              <p className="text-xs text-gray-500">Used for forecasting and admin dashboard metrics.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyRevenue">Current Average Monthly Revenue</Label>
              <Input
                id="monthlyRevenue"
                type="text"
                inputMode="numeric"
                value={monthlyRevenueDisplay}
                onChange={(e) => {
                  const raw = e.target.value
                  setMonthlyRevenueDisplay(raw)
                  const numeric = parseCurrencyString(raw)
                  setFormData({ ...formData, monthlyRevenue: numeric })
                }}
                onBlur={() => {
                  const n = formData.monthlyRevenue
                  setMonthlyRevenueDisplay(n ? formatCurrency0(n) : "")
                }}
                placeholder="$25,000"
              />
              <p className="text-xs text-gray-500">
                You can type values like "$25,000" or "25000". We&apos;ll format it and interpret the number correctly.
              </p>
            </div>

            <div className="space-y-4">
              <Label>Payment Methods Accepted</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptsCash"
                  checked={formData.acceptsCash}
                  onCheckedChange={(checked) => setFormData({ ...formData, acceptsCash: checked as boolean })}
                />
                <Label htmlFor="acceptsCash">Cash (Dollar Bills and Coins)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptsCards"
                  checked={formData.acceptsCards}
                  onCheckedChange={(checked) => setFormData({ ...formData, acceptsCards: checked as boolean })}
                />
                <Label htmlFor="acceptsCards">Credit/Debit Cards</Label>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Wash Dry Fold Service</Label>
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Do you currently offer Wash Dry Fold service?</Label>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="hasWashDryFoldYes"
                        name="hasWashDryFold"
                        checked={formData.hasWashDryFold === true}
                        onChange={() => setFormData({ ...formData, hasWashDryFold: true })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="hasWashDryFoldYes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="hasWashDryFoldNo"
                        name="hasWashDryFold"
                        checked={formData.hasWashDryFold === false}
                        onChange={() =>
                          setFormData({ ...formData, hasWashDryFold: false, wdfProvider: "", wdfOtherProvider: "" })
                        }
                        className="w-4 h-4"
                      />
                      <Label htmlFor="hasWashDryFoldNo">No</Label>
                    </div>
                  </div>
                </div>

                {formData.hasWashDryFold && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="wdfProvider">Who is your current provider?</Label>
                    <select
                      id="wdfProvider"
                      value={formData.wdfProvider}
                      onChange={(e) => setFormData({ ...formData, wdfProvider: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a provider</option>
                      <option value="Curbside">Curbside (TLB integration available)</option>
                      <option value="WDF POS">WDF POS (TLB integration available)</option>
                      <option value="Cleantie">Cleantie (TLB integration available)</option>
                      <option value="Laundry Boss">Laundry Boss</option>
                      <option value="CleanCloud">CleanCloud</option>
                      <option value="SMRT Systems">SMRT Systems</option>
                      <option value="Cents">Cents</option>
                      <option value="Turns">Turns</option>
                      <option value="Other">Other</option>
                    </select>

                    {formData.wdfProvider === "Other" && (
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="otherWdfProvider">Please specify your provider:</Label>
                        <Input
                          id="otherWdfProvider"
                          value={formData.wdfOtherProvider || ""}
                          onChange={(e) => setFormData({ ...formData, wdfOtherProvider: e.target.value })}
                          placeholder="Enter provider name"
                        />
                      </div>
                    )}
                  </div>
                )}

                {!formData.hasWashDryFold && (
                  <div className="space-y-3 ml-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="wantsWashDryFold"
                        checked={formData.wantsWashDryFold}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, wantsWashDryFold: checked as boolean })
                        }
                      />
                      <Label htmlFor="wantsWashDryFold">Add Laundry Boss Wash Dry Fold Service?</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="wantsPickupDelivery"
                        checked={formData.wantsPickupDelivery}
                        onCheckedChange={(checked) => {
                          const newState = {
                            ...formData,
                            wantsPickupDelivery: checked as boolean,
                            // Automatically select Wash Dry Fold if Pickup & Delivery is selected
                            wantsWashDryFold: checked ? true : formData.wantsWashDryFold,
                          }
                          setFormData(newState)
                        }}
                      />
                      <Label htmlFor="wantsPickupDelivery">Add Laundry Boss Pickup & Delivery Service?</Label>
                    </div>
                    {formData.wantsPickupDelivery && (
                      <div className="text-sm text-blue-600 ml-6">
                        ℹ️ Pickup & Delivery service automatically includes Wash Dry Fold service
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPaymentVendor"
                  checked={formData.hasPaymentVendor}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      hasPaymentVendor: checked as boolean,
                      currentVendor: checked ? formData.currentVendor : "",
                      currentVendorOther: checked ? formData.currentVendorOther : "",
                    })
                  }
                />
                <Label htmlFor="hasPaymentVendor">Currently use another payment provider</Label>
              </div>

              {formData.hasPaymentVendor && (
                <div className="space-y-2">
                  <Label htmlFor="currentVendor">Current Payment Provider</Label>
                  <select
                    id="currentVendor"
                    value={formData.currentVendor}
                    onChange={(e) => setFormData({ ...formData, currentVendor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a provider</option>
                    {paymentVendors.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>

                  {formData.currentVendor === "Other" && (
                    <div className="space-y-2">
                      <Label htmlFor="currentVendorOther">Please specify your provider:</Label>
                      <Input
                        id="currentVendorOther"
                        value={formData.currentVendorOther || ""}
                        onChange={(e) => setFormData({ ...formData, currentVendorOther: e.target.value })}
                        placeholder="Enter provider name"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label>Installation Services</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selfInstall"
                  checked={formData.selfInstall}
                  onCheckedChange={(checked) => setFormData({ ...formData, selfInstall: checked as boolean })}
                />
                <Label htmlFor="selfInstall">Self Install</Label>
              </div>
            </div>

            <div className="space-y-4">
              <Label>AI Services</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasAiAttendant"
                    checked={formData.hasAiAttendant}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasAiAttendant: checked as boolean })}
                  />
                  <Label htmlFor="hasAiAttendant">AI Attendant Service ($49.99/month)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasAiAttendantWithIntegration"
                    checked={formData.hasAiAttendantWithIntegration}
                    onCheckedChange={(checked) => {
                      const newState = {
                        ...formData,
                        hasAiAttendantWithIntegration: checked as boolean,
                        // Automatically select AI Attendant Service if this is selected
                        hasAiAttendant: checked ? true : formData.hasAiAttendant,
                      }
                      setFormData(newState)
                    }}
                  />
                  <Label htmlFor="hasAiAttendantWithIntegration">
                    AI Attendant with Laundry Boss Integration Service ($50.00/month)
                  </Label>
                </div>
                {formData.hasAiAttendantWithIntegration && (
                  <div className="text-sm text-blue-600 ml-6">
                    ℹ️ This service automatically includes AI Attendant Service
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Kiosk Options (Select all that apply)</Label>
              <div className="grid grid-cols-1 gap-6">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="rearLoadKiosk"
                      checked={formData.kioskOptions.rearLoad.selected}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          kioskOptions: {
                            ...formData.kioskOptions,
                            rearLoad: {
                              selected: checked as boolean,
                              quantity: checked
                                ? Math.max(1, formData.kioskOptions.rearLoad.quantity)
                                : formData.kioskOptions.rearLoad.quantity,
                            },
                          },
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="rearLoadKiosk" className="font-semibold">
                        Rear Load Kiosk
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        In the wall kiosk where money is accessed via a secure room
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Qty:</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.kioskOptions.rearLoad.quantity}
                        onChange={(e) => {
                          const qty = Number.parseInt(e.target.value) || 0
                          setFormData({
                            ...formData,
                            kioskOptions: {
                              ...formData.kioskOptions,
                              rearLoad: { selected: qty > 0, quantity: qty },
                            },
                          })
                        }}
                        className="w-16"
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="frontLoadKiosk"
                      checked={formData.kioskOptions.frontLoad.selected}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          kioskOptions: {
                            ...formData.kioskOptions,
                            frontLoad: {
                              selected: checked as boolean,
                              quantity: checked
                                ? Math.max(1, formData.kioskOptions.frontLoad.quantity)
                                : formData.kioskOptions.frontLoad.quantity,
                            },
                          },
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="frontLoadKiosk" className="font-semibold">
                        Front Load Kiosk
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Free Standing Kiosk used at locations where there is no secure room
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Qty:</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.kioskOptions.frontLoad.quantity}
                        onChange={(e) => {
                          const qty = Number.parseInt(e.target.value) || 0
                          setFormData({
                            ...formData,
                            kioskOptions: {
                              ...formData.kioskOptions,
                              frontLoad: { selected: qty > 0, quantity: qty },
                            },
                          })
                        }}
                        className="w-16"
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="creditBillKiosk"
                      checked={formData.kioskOptions.creditBill.selected}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          kioskOptions: {
                            ...formData.kioskOptions,
                            creditBill: {
                              selected: checked as boolean,
                              quantity: checked
                                ? Math.max(1, formData.kioskOptions.creditBill.quantity)
                                : formData.kioskOptions.creditBill.quantity,
                            },
                          },
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="creditBillKiosk" className="font-semibold">
                        EBT Kiosk
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        In the wall kiosk that accepts EBT payments. Please check your individual state requirements to
                        ensure your state allows EBT payments for laundry.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Qty:</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.kioskOptions.creditBill.quantity}
                        onChange={(e) => {
                          const qty = Number.parseInt(e.target.value) || 0
                          setFormData({
                            ...formData,
                            kioskOptions: {
                              ...formData.kioskOptions,
                              creditBill: { selected: qty > 0, quantity: qty },
                            },
                          })
                        }}
                        className="w-16"
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="creditOnlyKiosk"
                      checked={formData.kioskOptions.creditOnly.selected}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          kioskOptions: {
                            ...formData.kioskOptions,
                            creditOnly: {
                              selected: checked as boolean,
                              quantity: checked
                                ? Math.max(1, formData.kioskOptions.creditOnly.quantity)
                                : formData.kioskOptions.creditOnly.quantity,
                            },
                          },
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="creditOnlyKiosk" className="font-semibold">
                        Credit Card Only Kiosk
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">Hangs on the wall anywhere there is a power outlet</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Qty:</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.kioskOptions.creditOnly.quantity}
                        onChange={(e) => {
                          const qty = Number.parseInt(e.target.value) || 0
                          setFormData({
                            ...formData,
                            kioskOptions: {
                              ...formData.kioskOptions,
                              creditOnly: { selected: qty > 0, quantity: qty },
                            },
                          })
                        }}
                        className="w-16"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder="Any additional requirements or questions..."
              />
            </div>

            <Button type="submit" className="w-full">
              Generate Pricing Quote
            </Button>
          </form>
        </CardContent>
      </Card>

      {(formData.storeSize > 0 || formData.acceptsCash) && (
        <Card className="w-full max-w-2xl mx-auto bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-700 text-lg">💡 Smart Recommendations (Auto-Applied)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {formData.storeSize > 0 && formData.acceptsCash && (
                <>
                  {formData.storeSize < 1500 && (
                    <p>
                      • For a {formData.storeSize.toLocaleString()} sq ft store accepting cash, we've selected{" "}
                      <strong>1 Rear Load Kiosk</strong> to handle coin/bill payments efficiently.
                    </p>
                  )}
                  {formData.storeSize >= 1500 && formData.storeSize < 3000 && (
                    <p>
                      • For a {formData.storeSize.toLocaleString()} sq ft store, we've selected{" "}
                      <strong>1 Rear Load Kiosk</strong> for cash payments and <strong>1 Credit Card Only Kiosk</strong>{" "}
                      for card transactions.
                    </p>
                  )}
                  {formData.storeSize >= 3000 && formData.storeSize < 5000 && (
                    <p>
                      • For a {formData.storeSize.toLocaleString()} sq ft store, we've selected{" "}
                      <strong>2 Rear Load Kiosks</strong> and <strong>2 Credit Card Only Kiosks</strong> for optimal
                      customer flow.
                    </p>
                  )}
                  {formData.storeSize >= 5000 && (
                    <p>
                      • For a large {formData.storeSize.toLocaleString()} sq ft store, we've selected{" "}
                      <strong>2 Rear Load Kiosks</strong> and <strong>3 Credit Card Only Kiosks</strong> to handle high
                      volume.
                    </p>
                  )}
                </>
              )}
              {formData.storeSize > 0 && !formData.acceptsCash && formData.acceptsCards && (
                <>
                  {formData.storeSize < 2000 && (
                    <p>
                      • Since you only accept cards, we've selected <strong>1 Credit Card Only Kiosk</strong> for your{" "}
                      {formData.storeSize.toLocaleString()} sq ft store.
                    </p>
                  )}
                  {formData.storeSize >= 2000 && formData.storeSize < 4000 && (
                    <p>
                      • For a card-only {formData.storeSize.toLocaleString()} sq ft store, we've selected{" "}
                      <strong>2 Credit Card Only Kiosks</strong> for better customer service.
                    </p>
                  )}
                  {formData.storeSize >= 4000 && (
                    <p>
                      • For a large card-only {formData.storeSize.toLocaleString()} sq ft store, we've selected{" "}
                      <strong>3 Credit Card Only Kiosks</strong> to minimize wait times.
                    </p>
                  )}
                </>
              )}
              {formData.wantsWashDryFold && (
                <p>
                  • Wash Dry Fold service pairs well with <strong>Front Load Kiosks</strong> for premium customer
                  experience. You can manually add these if desired.
                </p>
              )}
              <p className="text-xs text-blue-600 mt-2">
                💡 These selections are automatically applied but can be manually adjusted below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
