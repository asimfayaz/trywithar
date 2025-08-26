"use client"

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function JobPollingProvider() {
  useEffect(() => {
    const refreshJobs = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return; // Skip if no session
        
        await fetch('/api/jobs/refresh', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
      } catch (error) {
        console.error('Job refresh failed:', error);
      }
    };

    // Initial refresh after 1 second to allow session to load
    const initialTimer = setTimeout(refreshJobs, 1000);
    
    // Set up 1-minute interval
    const interval = setInterval(refreshJobs, 60000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []); // Run only on mount

  return null; // This component doesn't render anything
}
