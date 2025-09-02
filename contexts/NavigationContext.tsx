import React, { createContext, useContext, useState, useEffect } from 'react'

export type ViewState = 'gallery' | 'upload' | 'generator' | 'preview'

interface NavigationContextType {
  currentView: ViewState
  setCurrentView: (view: ViewState) => void
  navigateToGallery: () => void
  navigateToUpload: () => void
  navigateToGenerator: () => void
  navigateToPreview: () => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewState>('gallery')
  
  // Load saved view from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('mobileCurrentView')
    if (savedView && ['gallery', 'upload', 'generator', 'preview'].includes(savedView)) {
      setCurrentView(savedView as ViewState)
    }
  }, [])

  // Save view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('mobileCurrentView', currentView)
  }, [currentView])
  
  const navigateToGallery = () => setCurrentView('gallery')
  const navigateToUpload = () => setCurrentView('upload')
  const navigateToGenerator = () => setCurrentView('generator')
  const navigateToPreview = () => setCurrentView('preview')

  return (
    <NavigationContext.Provider value={{
      currentView,
      setCurrentView,
      navigateToGallery,
      navigateToUpload,
      navigateToGenerator,
      navigateToPreview
    }}>
      {children}
    </NavigationContext.Provider>
  )
}
