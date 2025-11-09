/**
 * Check if WebGL is available in the current browser environment
 * Returns false in headless browsers, non-browser environments, or when WebGL is disabled
 */
export function isWebGLAvailable(): boolean {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    // Try to create a WebGL context
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    // Clean up
    if (gl && gl instanceof WebGLRenderingContext) {
      // Context created successfully
      return true;
    }
    
    return false;
  } catch (e) {
    // WebGL not supported or error during context creation
    console.warn('WebGL check failed:', e);
    return false;
  }
}
