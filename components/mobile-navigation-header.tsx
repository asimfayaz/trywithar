"use client"

import { Button } from "@/components/ui/button"
import { useNavigation } from "@/contexts/NavigationContext"
import { Logo } from "@/components/logo"
import { UserDashboard } from "@/components/user-dashboard"
import type { User } from "@/app/page"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MobileNavigationHeaderProps {
  currentView: string
  onBack?: () => void
  user: User | null
  onLogin: () => void
  onLogout: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MobileNavigationHeader({
  currentView,
  onBack,
  user,
  onLogin,
  onLogout
}: MobileNavigationHeaderProps) {
  const { navigateToGallery } = useNavigation()

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Returns the appropriate title text based on the current view
   * Returns null for gallery view (no title needed)
   */
  const getTitle = () => {
    if (currentView === 'gallery') return null

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

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const isGallery = currentView === 'gallery'
  const showBackButton = currentView !== 'gallery'
  const title = getTitle()

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
      {/* Left Section: Logo/Back Button + Title */}
      <div className="flex items-center space-x-2">
        {isGallery ? (
          // Gallery View: Display logo with app name
          <div className="flex items-center">
            <Logo />
            <h1 className="text-xl font-bold text-gray-900 ml-3">
              Try with AR
            </h1>
          </div>
        ) : (
          // Non-Gallery Views: Back button with page title
          <>
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack || navigateToGallery}
                className="h-8 w-8"
                aria-label="Go back"
              >
                <span className="text-lg">←</span>
              </Button>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
          </>
        )}
      </div>
      
      {/* Right Section: User Authentication Dashboard */}
      <div className="flex items-center space-x-2">
        <UserDashboard
          user={user}
          onLogin={onLogin}
          onLogout={onLogout}
        />
      </div>
    </div>
  )
}
