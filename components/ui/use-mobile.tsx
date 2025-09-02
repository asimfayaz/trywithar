import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkIsMobile = () => {
      return window.innerWidth < MOBILE_BREAKPOINT
    }

    // Set initial value
    setIsMobile(checkIsMobile())

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(checkIsMobile())
    }
    
    mql.addEventListener("change", onChange)
    
    return () => {
      mql.removeEventListener("change", onChange)
    }
  }, [])

  // Return false while undefined to avoid flickering
  return isMobile ?? false
}
