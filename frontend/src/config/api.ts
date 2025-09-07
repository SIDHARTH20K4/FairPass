// Centralized API configuration
export const API_CONFIG = {BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://fairpass.onrender.com/api',
  
  // API endpoints
  ENDPOINTS: {
    EVENTS: '/events',
    REGISTRATIONS: '/events',
    ORGANIZATIONS: '/organizations',
    AUTH: '/auth'
  }
};

// Helper function to get full API URL
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Helper function for API requests
export async function apiRequest(endpoint: string, options?: RequestInit) {
  const url = getApiUrl(endpoint);
  console.log('Making API request to:', url);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error('API error response:', response.status, text);
    throw new Error(`API error ${response.status}: ${text}`);
  }
  
  return response.json();
}
