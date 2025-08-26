/**
 * Maps Replicate API statuses to our internal status system
 * @param status Replicate API status
 * @returns Internal status ('queued', 'processing', 'completed', or 'failed')
 */
export function mapReplicateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'succeeded': 'completed',
    'canceled': 'failed',
    'failed': 'failed',
    'queued': 'queued',
    'processing': 'processing',
    'starting': 'processing'
  };
  
  return statusMap[status] || status;
}
