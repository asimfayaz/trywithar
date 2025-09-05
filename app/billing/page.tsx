"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { supabase, userService, modelService, type AuthUser } from "@/lib/supabase"

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [userPhotos, setUserPhotos] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [session, setSession] = useState<any>(null);

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error('No authenticated user found', sessionError);
          return;
        }
        
        setSession(session);
        
        // Get user data using userService
        const userData = await userService.getUserById(session.user.id);
        setUser(userData);
        
        // Get user's models to calculate total models generated
        const models = await modelService.getModelsByUserId(userData.id)
        setUserPhotos(models)
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadUserData()
  }, [])

  // State for transactions and pagination
  const [transactions, setTransactions] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)

  // Fetch transaction history
  const fetchTransactions = async (page: number) => {
    setIsLoadingTransactions(true)
    try {
      const response = await fetch(`/api/transactions?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setTransactions(data.transactions)
        setTotalPages(data.pagination.totalPages)
      } else {
        console.error('Failed to fetch transactions:', data.error)
      }
    } catch (error) {
      console.error('Network error fetching transactions:', error)
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  // Load transactions when component mounts or page changes
  useEffect(() => {
    if (user) {
      fetchTransactions(currentPage)
    }
  }, [user, currentPage])

  const handlePurchase = async (amount: number) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    alert(`Purchase of $${amount} completed! (This is a demo)`)
    setIsLoading(false)
  }

  const totalModelsGenerated = userPhotos.length

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{user.credits}</div>
                  <p className="text-sm text-gray-600">Available Credits</p>
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
                { amount: 20, credits: 22, popular: true },
                { amount: 30, credits: 35, popular: false },
                { amount: 40, credits: 50, popular: false },
              ].map((option) => (
                <TooltipProvider key={option.amount}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
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
                          disabled={true}
                          className="w-full"
                          variant={option.popular ? "default" : "outline"}
                        >
                          Purchase
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
            {isLoadingTransactions ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No transactions found</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {transactions.map((transaction, index) => (
                    <div key={transaction.id}>
                      <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === "purchase" 
                            ? "bg-green-100 text-green-600" 
                            : transaction.type === "award"
                              ? "bg-purple-100 text-purple-600"
                              : "bg-blue-100 text-blue-600"
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
                        ) : transaction.type === "award" ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
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
                            ? `Bought credits - $${transaction.amount?.toFixed(0)}`
                            : transaction.type === "award"
                              ? transaction.description || "Credit Award"
                              : transaction.description || "Credit Usage"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()} {new Date(transaction.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-medium ${
                          transaction.type === "purchase" 
                            ? "text-green-600" 
                            : transaction.type === "award"
                              ? "text-purple-600"
                              : "text-red-600"
                        }`}
                      >
                        {transaction.type === "purchase" || transaction.type === "award" ? "+" : "-"}
                        {Math.abs(transaction.credits)}
                      </div>
                    </div>
                  </div>
                  {index < transactions.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
                {/* Pagination controls */}
                <div className="mt-6 flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
