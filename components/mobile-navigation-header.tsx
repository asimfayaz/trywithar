"use client"

import { Button } from "@/components/ui/button"
import { useNavigation } from "@/contexts/NavigationContext"
import { Logo } from "@/components/logo"
import { UserDashboard } from "@/components/user-dashboard"
import type { User } from "@/app/page"

interface MobileNavigationHeaderProps {
  currentView: string
  onBack?: () => void
  user: User | null
  onLogin: () => void
  onLogout: () => void
}

export function MobileNavigationHeader({ currentView, onBack, user, onLogin, onLogout }: MobileNavigationHeaderProps) {
  const { navigateToGallery } = useNavigation()

  const getTitle = () => {
    if (currentView === 'gallery') return null // No title for gallery
    switch (currentView) {
      case 'upload':
        return 'Upload Photos'
      case 'generator':
        return '3D Model Generator'
      case 'preview':
        return '3D Model Preview'
      default:
        return 'Try with AR'
    }
  }

  const showBackButton = currentView !== 'gallery'
  const isGallery = currentView === 'gallery'

  return (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {isGallery ? (
          // Gallery view: Show logo and app name
          <div className="flex items-center">
            <Logo />
            <h1 className="text-xl font-bold text-gray-900 ml-3">Try with AR</h1>
          </div>
        ) : (
          // Non-gallery views: Back button + title
          <>
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack || navigateToGallery}
                className="h-8 w-8"
              >
                <span className="text-lg">←</span>
              </Button>
            )}
            <h2 className="text-lg font-semibold text-gray-900">{getTitle()}</h2>
          </>
        )}
      </div>
      
      {/* Right side - User Dashboard */}
      <div className="flex items-center space-x-2">
        {/* Existing UserDashboard */}
        <UserDashboard user={user} onLogin={onLogin} onLogout={onLogout} />
      </div>
    </div>
  )
}
