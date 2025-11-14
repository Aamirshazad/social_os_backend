/**
 * Video Progress Utilities
 * Helper functions to extract progress information from video operations
 */

interface VideoOperation {
  done?: boolean;
  metadata?: {
    createTime?: string;
    updateTime?: string;
    [key: string]: any;
  };
  response?: any;
  error?: any;
}

/**
 * Calculate progress percentage from video operation
 * Returns a value between 0-100
 */
export function calculateVideoProgress(operation: VideoOperation | null | undefined): number {
  if (!operation) return 0;
  
  // If completed, return 100%
  if (operation.done) {
    return 100;
  }
  
  // If we have timing information, estimate based on elapsed time
  if (operation.metadata?.createTime && operation.metadata?.updateTime) {
    const createTime = new Date(operation.metadata.createTime).getTime();
    const updateTime = new Date(operation.metadata.updateTime).getTime();
    const now = Date.now();
    
    const elapsed = now - createTime;
    // Average video generation takes 2-5 minutes (120-300 seconds)
    // Estimate at 3 minutes (180 seconds)
    const estimatedTotal = 180000; // 180 seconds in milliseconds
    
    const progress = Math.min((elapsed / estimatedTotal) * 100, 95);
    return Math.round(progress);
  }
  
  // Default to a conservative estimate if no timing info
  return 10;
}

/**
 * Get human-readable status from video operation
 */
export function getVideoStatusMessage(operation: VideoOperation | null | undefined, fallback: string = 'Processing...'): string {
  if (!operation) return fallback;
  
  if (operation.done) {
    if (operation.error) {
      return 'Generation failed';
    }
    if (operation.response) {
      return 'Finalizing video...';
    }
    return 'Complete!';
  }
  
  // Extract any status message from metadata
  if (operation.metadata) {
    // Check for common status fields
    if ((operation.metadata as any).status) {
      return (operation.metadata as any).status;
    }
    if ((operation.metadata as any).state) {
      return (operation.metadata as any).state;
    }
  }
  
  return fallback;
}

/**
 * Determine if operation is still in progress
 */
export function isVideoOperationInProgress(operation: VideoOperation | null | undefined): boolean {
  if (!operation) return false;
  return !operation.done && !operation.error;
}

/**
 * Get estimated time remaining in seconds
 */
export function getEstimatedTimeRemaining(operation: VideoOperation | null | undefined): number | null {
  if (!operation || operation.done) return null;
  
  if (operation.metadata?.createTime) {
    const createTime = new Date(operation.metadata.createTime).getTime();
    const now = Date.now();
    const elapsed = now - createTime;
    
    // Average video generation: 3 minutes
    const estimatedTotal = 180000;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    return Math.round(remaining / 1000); // Convert to seconds
  }
  
  return null;
}
