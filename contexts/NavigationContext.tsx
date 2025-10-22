import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Type alias
export type ViewState = 'gallery' | 'upload' | 'generator' | 'preview'

// Context interface
interface NavigationContextType {
  currentView: ViewState
  currentModelId: string | null
  navigateToGallery: () => void
  navigateToUpload: () => void
  navigateToGenerator: (modelId: string) => void
  navigateToPreview: (modelId: string) => void
}
// Context creation and usage hook
const NavigationContext = createContext<NavigationContextType | null>(null)
export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

// Provider component
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

   // State variables and initial values
  const [currentView, setCurrentView] = useState<ViewState>('gallery')
  const [currentModelId, setCurrentModelId] = useState<string | null>(null)
  const navigationInProgress = useRef(false)
  
  // UseEffect hook to initialize state from URL parameters
  useEffect(() => {
    if (navigationInProgress.current) return;

    const viewParam = searchParams.get('view') as ViewState | null
    const modelIdParam = searchParams.get('modelId')
    
    if (viewParam && ['gallery', 'upload', 'generator', 'preview'].includes(viewParam)) {
      setCurrentView(viewParam)
    }
    
    if (modelIdParam) {
      setCurrentModelId(modelIdParam)
    } else {
      setCurrentModelId(null)
    }
  }, [searchParams])

  
  // Helper function to create URL with query parameters for deep linking
  const createUrl = (view: ViewState, modelId?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    
    if (modelId && !modelId.startsWith('temp-')) {
      params.set('modelId', modelId)
    } else {
      params.delete('modelId')
    }
    
    return `${pathname}?${params.toString()}`
  }

  // Navigation functions
  const navigateToGallery = () => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    router.push(createUrl('gallery'))
    setCurrentView('gallery')
    setCurrentModelId(null)
    
    // Reset navigation flag after a short delay
    setTimeout(() => {
      navigationInProgress.current = false;
    }, 100)
  }
  
  const navigateToUpload = () => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    router.push(createUrl('upload'))
    setCurrentView('upload')
    setCurrentModelId(null)
    
    // Reset navigation flag after a short delay
    setTimeout(() => {
      navigationInProgress.current = false;
    }, 100)
  }
  
  const navigateToGenerator = (modelId: string) => {
    //if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    // Ensure we set the modelId before navigating to avoid race conditions
    setCurrentModelId(modelId);
    router.push(createUrl('generator', modelId))
    setCurrentView('generator')
    
    // Reset navigation flag after a short delay
    //setTimeout(() => {
      navigationInProgress.current = false;
    //}, 100)
  }
  
  const navigateToPreview = (modelId: string) => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    router.push(createUrl('preview', modelId))
    setCurrentView('preview')
    setCurrentModelId(modelId)
    
    // Reset navigation flag after a short delay
    setTimeout(() => {
      navigationInProgress.current = false;
    }, 100)
  }

  // Add a method to check if navigation is in progress
  const isNavigating = () => navigationInProgress.current;

  return (
    <NavigationContext.Provider value={{
      currentView,
      currentModelId,
      navigateToGallery,
      navigateToUpload,
      navigateToGenerator,
      navigateToPreview
    }}>
      {children}
    </NavigationContext.Provider>
  )
}
