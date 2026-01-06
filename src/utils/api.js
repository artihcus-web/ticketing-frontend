// API base URL - adjust based on your backend deployment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Make an API request to the backend
 * @param {string} endpoint - API endpoint (e.g., '/auth/login')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>}
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
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
          window.location.href = '/login';
        }
      }
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || 'Request failed');
    }

    return response.json();
  } catch (error) {
    // Handle network errors (connection refused, timeout, etc.)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(`Cannot connect to server. Please make sure the backend is running on ${API_BASE_URL}`);
    }
    // Re-throw other errors (including our custom Error from above)
    throw error;
  }
};

