"use client"

import type { User } from "@/app/page"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"

interface UserDashboardProps {
  user: User | null
  onLogin: () => void
  onLogout: () => void
}

export function UserDashboard({ user, onLogin, onLogout }: UserDashboardProps) {
  const router = useRouter()

  if (!user) {
    return (
      <Button onClick={onLogin} variant="outline">
        Sign In
      </Button>
    )
  }

  const freeModelsRemaining = Math.max(0, 2 - user.freeModelsUsed)

  return (
    <div className="flex items-center space-x-4">
      {/* Quota Display */}
      <div className="text-sm text-gray-600">
        {freeModelsRemaining > 0 ? (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
            {freeModelsRemaining}/2 free models left
          </span>
        ) : (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Credits: ${user.credits.toFixed(2)}</span>
        )}
      </div>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback>
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{user.name}</p>
              <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Usage</span>
              <span className="text-xs text-muted-foreground">Free models: {user.freeModelsUsed}/2</span>
              <span className="text-xs text-muted-foreground">Credits: ${user.credits.toFixed(2)}</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => router.push("/billing")}>Manage Billing</DropdownMenuItem>

          <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onLogout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
