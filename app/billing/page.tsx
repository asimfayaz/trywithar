"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CreditCard, DollarSign, History } from "lucide-react"

export default function BillingPage() {
  const router = useRouter()
  const [creditAmount, setCreditAmount] = useState("10")
  const [isProcessing, setIsProcessing] = useState(false)

  // Mock user data - in real app this would come from context/API
  const user = {
    name: "John Doe",
    email: "john@example.com",
    credits: 5.0,
    freeModelsUsed: 2,
    totalModelsGenerated: 15,
  }

  // Mock transaction history
  const transactions = [
    { id: "1", date: "2024-01-15", amount: 20.0, type: "purchase", description: "Credit purchase" },
    { id: "2", date: "2024-01-14", amount: -1.0, type: "usage", description: "3D model generation" },
    { id: "3", date: "2024-01-13", amount: -1.0, type: "usage", description: "3D model generation" },
    { id: "4", date: "2024-01-10", amount: 10.0, type: "purchase", description: "Credit purchase" },
    { id: "5", date: "2024-01-09", amount: -1.0, type: "usage", description: "3D model generation" },
  ]

  const handlePurchaseCredits = async () => {
    setIsProcessing(true)
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsProcessing(false)
    alert(`Successfully purchased $${creditAmount} in credits!`)
  }

  const presetAmounts = ["10", "25", "50", "100"]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Manage Billing</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Current Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Current Balance</span>
            </CardTitle>
            <CardDescription>Your available credits and usage summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">${user.credits.toFixed(2)}</div>
                <p className="text-sm text-gray-600">Available Credits</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{user.freeModelsUsed}/2</div>
                <p className="text-sm text-gray-600">Free Models Used</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{user.totalModelsGenerated}</div>
                <p className="text-sm text-gray-600">Total Models Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Purchase Credits</span>
            </CardTitle>
            <CardDescription>
              Add credits to your account. $1 = 1 model generation. Minimum purchase: $10
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    id="amount"
                    type="number"
                    min="10"
                    step="1"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
            </div>

            {/* Preset Amounts */}
            <div className="space-y-2">
              <Label>Quick Select</Label>
              <div className="flex space-x-2">
                {presetAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={creditAmount === amount ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCreditAmount(amount)}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>You will receive:</strong> ${creditAmount} in credits ({creditAmount} model generations)
              </p>
            </div>

            <Button
              onClick={handlePurchaseCredits}
              disabled={isProcessing || Number.parseInt(creditAmount) < 10}
              className="w-full"
            >
              {isProcessing ? "Processing..." : `Purchase $${creditAmount} Credits`}
            </Button>

            <p className="text-xs text-gray-500 text-center">Secure payment powered by Stripe. Credits never expire.</p>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>Transaction History</span>
            </CardTitle>
            <CardDescription>Your recent credit purchases and usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        transaction.type === "purchase" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-600">{transaction.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={transaction.type === "purchase" ? "default" : "secondary"}>
                      {transaction.type === "purchase" ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
