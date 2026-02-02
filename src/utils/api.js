// API base URL - adjust based on your backend deployment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Make an API request to the backend
 * @param {string} endpoint - API endpoint (e.g., '/auth/login')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>}
 */
export const apiRequest = async (endpoint, options = {}) => {
  const prefix = endpoint.startsWith('/api') ? '' : '/api';
  const url = `${API_BASE_URL}${prefix}${endpoint}`;
  const token = localStorage.getItem('token');

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add token to headers if available
  if (token && !options.headers?.['Authorization']) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      // Prevent stale cached API responses (fixes 304/Not Modified issues on some proxies/browsers)
      cache: 'no-store',
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      // If unauthorized, clear token and redirect to login
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        if (window.location.pathname !== '/login') {
          // window.location.href = '/login';
          // Dispatch a custom event to trigger soft logout via AuthContext
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || 'Request failed');
    }

    return response.json();
  } catch (error) {
    // Handle network errors (connection refused, timeout, etc.)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      // Log helpful debug info in development
      if (import.meta.env.DEV) {
        console.error('API Request Failed:', {
          url,
          apiBaseUrl: API_BASE_URL,
          error: error.message
        });
      }
      // Check if trying to connect to localhost in production
      if (API_BASE_URL.includes('localhost') && window.location.hostname !== 'localhost') {
        throw new Error(`Configuration error: Frontend is trying to connect to localhost. Please set VITE_API_BASE_URL environment variable in your deployment platform to your backend URL.`);
      }
      throw new Error(`Cannot connect to server at ${API_BASE_URL}. Please check your backend is running and accessible.`);
    }
    // Re-throw other errors (including our custom Error from above)
    throw error;
  }
};

