"use client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import type { User } from "@/app/page"

interface UserDashboardProps {
  user: User | null
  onLogin: () => void
  onLogout: () => void
}

export function UserDashboard({ user, onLogin, onLogout }: UserDashboardProps) {
  if (!user) {
    return (
      <Button onClick={onLogin} variant="default">
        Sign In
      </Button>
    )
  }

  const freeModelsRemaining = Math.max(0, 2 - user.freeModelsUsed)
  const hasCredits = user.credits > 0

  return (
    <div className="flex items-center space-x-4">
      {/* Quota Display */}
      <div className="hidden sm:flex items-center space-x-2 text-sm">
        {freeModelsRemaining > 0 ? (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {freeModelsRemaining} free models left
          </Badge>
        ) : hasCredits ? (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            ${user.credits.toFixed(2)} credits
          </Badge>
        ) : (
          <Badge variant="destructive">No credits remaining</Badge>
        )}
      </div>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex flex-col space-y-1 p-2">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
          <DropdownMenuSeparator />

          {/* Mobile quota display */}
          <div className="sm:hidden p-2">
            {freeModelsRemaining > 0 ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 w-full justify-center">
                {freeModelsRemaining} free models left
              </Badge>
            ) : hasCredits ? (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 w-full justify-center">
                ${user.credits.toFixed(2)} credits
              </Badge>
            ) : (
              <Badge variant="destructive" className="w-full justify-center">
                No credits remaining
              </Badge>
            )}
          </div>
          <DropdownMenuSeparator className="sm:hidden" />

          <DropdownMenuItem asChild>
            <Link href="/billing">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Manage Billing
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/settings">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onLogout}>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
