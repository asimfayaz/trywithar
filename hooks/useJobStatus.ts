"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Job } from '@/lib/supabase/types';

export function useJobStatus(jobId: string | null) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Initial fetch
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('api_status, error_message')
        .eq('id', jobId)
        .single();
      
      if (error) {
        console.error('Error fetching job status:', error);
        return;
      }
      
      setStatus(data.api_status);
      setError(data.error_message);
    };

    fetchStatus();

    // Real-time subscription
    const subscription = supabase
      .channel('job-status-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`
      }, (payload) => {
        const newData = payload.new as Job;
        setStatus(newData.api_status);
        setError(newData.error_message || null);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [jobId]);

  return { status, error };
}
