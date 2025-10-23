import * as React from "react"

// Breakpoint threshold in pixels - screens narrower than this are considered mobile
const MOBILE_BREAKPOINT = 768

/**
 * Custom hook to detect if the current viewport is mobile-sized
 * @returns {boolean} True if viewport width is below the mobile breakpoint, false otherwise
 */
export function useIsMobile() {
  // Track mobile state - starts as undefined until first check completes
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Helper function to check if current window width is below mobile breakpoint
    const checkIsMobile = () => {
      return window.innerWidth < MOBILE_BREAKPOINT
    }

    // Set initial mobile state on mount
    setIsMobile(checkIsMobile())

    // Create media query listener for viewport width changes
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Handler to update mobile state when viewport size changes
    const onChange = () => {
      setIsMobile(checkIsMobile())
    }
    
    // Subscribe to viewport size changes
    mql.addEventListener("change", onChange)
    
    // Cleanup: remove listener when component unmounts
    return () => {
      mql.removeEventListener("change", onChange)
    }
  }, []) // Empty dependency array - only run once on mount

  // Return false instead of undefined to prevent layout flickering during initial render
  return isMobile ?? false
}
