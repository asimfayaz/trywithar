"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { userService, photoService, type AuthUser } from "@/lib/supabase"
import { authService } from "@/lib/auth"

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [userPhotos, setUserPhotos] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get current authenticated user
        const userData = await authService.getCurrentUser()
        if (!userData) {
          console.error('No authenticated user found')
          return
        }
        setUser(userData)
        
        // Get user's photos to calculate total models generated
        const photos = await photoService.getPhotosByUserId(userData.id)
        setUserPhotos(photos)
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadUserData()
  }, [])

  // Mock transaction history
  const transactions = [
    {
      id: "1",
      type: "purchase" as const,
      amount: 10.0,
      credits: 10,
      date: new Date("2024-01-15"),
      status: "completed" as const,
    },
    {
      id: "2",
      type: "usage" as const,
      amount: -1.0,
      credits: -1,
      date: new Date("2024-01-14"),
      status: "completed" as const,
      description: "3D Model Generation",
    },
    {
      id: "3",
      type: "usage" as const,
      amount: -1.0,
      credits: -1,
      date: new Date("2024-01-13"),
      status: "completed" as const,
      description: "3D Model Generation",
    },
    {
      id: "4",
      type: "purchase" as const,
      amount: 25.0,
      credits: 25,
      date: new Date("2024-01-10"),
      status: "completed" as const,
    },
  ]

  const handlePurchase = async (amount: number) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    alert(`Purchase of $${amount} completed! (This is a demo)`)
    setIsLoading(false)
  }

  const freeModelsRemaining = user ? Math.max(0, 2 - user.free_models_used) : 0
  const totalModelsGenerated = userPhotos.length
  const completedModels = userPhotos.filter(photo => photo.generation_status === 'ready').length

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load user data</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">Return to Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Manage Billing</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Current Balance */}
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
            <CardDescription>Your account balance and usage summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">${user.credits.toFixed(2)}</div>
                <p className="text-sm text-gray-600">Available Credits</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{freeModelsRemaining}</div>
                <p className="text-sm text-gray-600">Free Models Remaining</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{totalModelsGenerated}</div>
                <p className="text-sm text-gray-600">Total Models Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Credits */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Credits</CardTitle>
            <CardDescription>Each credit generates one 3D model. Minimum purchase is $10.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { amount: 10, credits: 10, popular: false },
                { amount: 25, credits: 25, popular: true },
                { amount: 50, credits: 50, popular: false },
                { amount: 100, credits: 100, popular: false },
              ].map((option) => (
                <div
                  key={option.amount}
                  className={`relative border rounded-lg p-4 text-center ${
                    option.popular ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  {option.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500">
                      Most Popular
                    </Badge>
                  )}
                  <div className="text-2xl font-bold">${option.amount}</div>
                  <div className="text-sm text-gray-600 mb-4">{option.credits} credits</div>
                  <Button
                    onClick={() => handlePurchase(option.amount)}
                    disabled={isLoading}
                    className="w-full"
                    variant={option.popular ? "default" : "outline"}
                  >
                    {isLoading ? "Processing..." : "Purchase"}
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Secure payment processing powered by Stripe</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent purchases and usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={transaction.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === "purchase" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {transaction.type === "purchase" ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 01-11.651-2.235c0-1.21.357-2.335.971-3.282A5.002 5.002 0 0112 2c2.761 0 5 2.239 5 5 0 .34-.035.672-.1.994l2.387.477a2 2 0 001.022-.547z"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {transaction.type === "purchase"
                            ? `Credit Purchase - ${transaction.credits} credits`
                            : transaction.description || "Credit Usage"}
                        </div>
                        <div className="text-sm text-gray-500">{transaction.date.toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-medium ${transaction.type === "purchase" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "purchase" ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                      <Badge
                        variant={transaction.status === "completed" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                  {index < transactions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
