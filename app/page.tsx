"use client"

import { useState } from "react"
import { Questionnaire, type QuestionnaireData } from "@/components/questionnaire"
import { PricingCalculator } from "@/components/pricing-calculator"
import Image from "next/image"

export default function Home() {
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null)
  const [currentView, setCurrentView] = useState<"form" | "quote">("form")

  const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
    try {
      await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    } catch (err) {
      console.error("Failed to save quote", err)
    }
    setQuestionnaireData(data)
    setCurrentView("quote")
  }

  const handleBack = () => {
    setCurrentView("form")
  }

  const handleNewQuote = () => {
    setQuestionnaireData(null)
    setCurrentView("form")
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/laundry-boss-logo.png"
              alt="The Laundry Boss"
              width={400}
              height={120}
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Pricing Calculator</h1>
          <p className="text-xl text-gray-600">Get an instant quote for your laundromat modernization</p>
        </div>

        {currentView === "form" ? (
          <Questionnaire onComplete={handleQuestionnaireComplete} initialData={questionnaireData} />
        ) : (
          <PricingCalculator data={questionnaireData!} onBack={handleBack} onNewQuote={handleNewQuote} />
        )}
      </div>
    </main>
  )
}
