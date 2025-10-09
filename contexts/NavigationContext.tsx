import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export type ViewState = 'gallery' | 'upload' | 'generator' | 'preview'

interface NavigationContextType {
  currentView: ViewState
  navigateToGallery: () => void
  navigateToUpload: () => void
  navigateToGenerator: (modelId: string) => void
  navigateToPreview: (modelId: string) => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

/**
 * Provides navigation context for deep linking functionality
 * Synchronizes view state with URL parameters:
 * - `view`: Current view (gallery, upload, generator, preview)
 * - `modelId`: ID of selected model (for generator/preview views)
 */
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [currentView, setCurrentView] = useState<ViewState>('gallery')
  
  // Initialize from URL parameters
  useEffect(() => {
    const viewParam = searchParams.get('view') as ViewState | null
    if (viewParam && ['gallery', 'upload', 'generator', 'preview'].includes(viewParam)) {
      setCurrentView(viewParam)
    }
  }, [searchParams])

  // Create URL with query parameters
  /**
   * Creates URL with query parameters for deep linking
   * @param view - The target view
   * @param modelId - Optional model ID for generator/preview views
   * @returns URL string with query parameters
   */
  const createUrl = (view: ViewState, modelId?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    
    if (modelId) {
      params.set('modelId', modelId)
    } else {
      params.delete('modelId')
    }
    
    return `${pathname}?${params.toString()}`
  }

  // Navigation functions
  const navigateToGallery = () => {
    router.push(createUrl('gallery'))
    setCurrentView('gallery')
  }
  
  const navigateToUpload = () => {
    router.push(createUrl('upload'))
    setCurrentView('upload')
  }
  
  const navigateToGenerator = (modelId: string) => {
    router.push(createUrl('generator', modelId))
    setCurrentView('generator')
  }
  
  const navigateToPreview = (modelId: string) => {
    router.push(createUrl('preview', modelId))
    setCurrentView('preview')
  }

  return (
    <NavigationContext.Provider value={{
      currentView,
      navigateToGallery,
      navigateToUpload,
      navigateToGenerator,
      navigateToPreview
    }}>
      {children}
    </NavigationContext.Provider>
  )
}
