import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents the possible view states in the application
 * - gallery: Main view showing all models
 * - upload: View for uploading new models
 * - generator: View for generating content with a specific model
 * - preview: View for previewing a specific model
 */
export type ViewState = 'gallery' | 'upload' | 'generator' | 'preview'

/**
 * Interface defining the navigation context API
 * Provides current state and navigation methods to child components
 */
interface NavigationContextType {
  currentView: ViewState
  currentModelId: string | null
  navigateToGallery: () => void
  navigateToUpload: () => void
  navigateToGenerator: (modelId: string) => void
  navigateToPreview: (modelId: string) => void
}

// ============================================================================
// CONTEXT SETUP
// ============================================================================

const NavigationContext = createContext<NavigationContextType | null>(null)

/**
 * Custom hook to access navigation context
 * @throws Error if used outside of NavigationProvider
 * @returns NavigationContextType with current state and navigation methods
 */
export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_VIEWS: ViewState[] = ['gallery', 'upload', 'generator', 'preview']
const NAVIGATION_DELAY_MS = 100

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Next.js routing hooks
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Component state
  const [currentView, setCurrentView] = useState<ViewState>('gallery')
  const [currentModelId, setCurrentModelId] = useState<string | null>(null)
  
  /**
   * Ref to track navigation in progress and prevent duplicate navigations
   * This prevents race conditions when multiple navigation calls happen simultaneously
   */
  const navigationInProgress = useRef(false)
  
  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * Synchronize component state with URL parameters on mount and URL changes
   * This enables deep linking and browser back/forward navigation
   */
  useEffect(() => {
    // Skip if navigation is currently in progress to avoid conflicts
    if (navigationInProgress.current) return;

    const viewParam = searchParams.get('view') as ViewState | null
    const modelIdParam = searchParams.get('modelId')
    
    // Update view if valid view parameter exists in URL
    if (viewParam && VALID_VIEWS.includes(viewParam)) {
      setCurrentView(viewParam)
    }
    
    // Update modelId or clear it based on URL parameter
    setCurrentModelId(modelIdParam || null)
  }, [searchParams])

  
  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Creates a URL string with updated query parameters for navigation
   * @param view - The view state to navigate to
   * @param modelId - Optional model ID (excluded if starts with 'temp-')
   * @returns Complete URL string with query parameters
   */
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

  /**
   * Resets the navigation lock after a delay
   * Prevents rapid successive navigation calls
   */
  const resetNavigationLock = (): void => {
    setTimeout(() => {
      navigationInProgress.current = false
    }, NAVIGATION_DELAY_MS)
  }

  // ==========================================================================
  // NAVIGATION METHODS
  // ==========================================================================

  /**
   * Navigate to the gallery view (main model listing)
   * Clears any selected model
   */
  const navigateToGallery = () => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    setCurrentView('gallery')
    setCurrentModelId(null)
    router.push(createUrl('gallery'))
    
    resetNavigationLock()
  }
  
  /**
   * Navigate to the upload view (for adding new models)
   * Clears any selected model
   */
  const navigateToUpload = () => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    setCurrentView('upload')
    setCurrentModelId(null)
    router.push(createUrl('upload'))
    
    resetNavigationLock()
  }
  
  /**
   * Navigate to the generator view for a specific model
   * @param modelId - ID of the model to use for generation
   */
  const navigateToGenerator = (modelId: string) => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    // Set modelId first to prevent race conditions
    setCurrentModelId(modelId);
    setCurrentView('generator')
    router.push(createUrl('generator', modelId))
    
    resetNavigationLock()
  }
  
  /**
   * Navigate to the preview view for a specific model
   * @param modelId - ID of the model to preview
   */
  const navigateToPreview = (modelId: string) => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    setCurrentView('preview')
    setCurrentModelId(modelId)
    router.push(createUrl('preview', modelId))

    resetNavigationLock()
  }

  // ==========================================================================
  // PROVIDER RENDER
  // ==========================================================================

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
