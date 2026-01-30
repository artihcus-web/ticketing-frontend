import { createContext, useContext, useState, useEffect } from 'react';

import PropTypes from 'prop-types';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();

    // Listen for unauthorized events (soft logout)
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setIsAuthenticated(false);
        return;
      }

      // Verify token with external API directly (CORS should be handled on external app)
      const apiBase = import.meta.env.VITE_EMPLOYEES_API_URL || 'https://api.artihcus.com:8443/';
      const verifyUrl = `${apiBase.endsWith('/') ? apiBase : apiBase + '/'}api/auth/me`;

      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // The external API verify endpoint likely returns a similar user object structure
        if (data.user) {
          const fullName = data.user.fullName || '';
          const nameParts = fullName.split(' ');

          const mappedUser = {
            id: data.user.id || data.user._id,
            email: data.user.email,
            role: data.user.role,
            empId: data.user.username,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            fullName: fullName
          };

          setUser(mappedUser);
          setIsAuthenticated(true);

          localStorage.setItem('userInfo', JSON.stringify({
            name: fullName.trim() || data.user.email,
            empId: mappedUser.empId,
            clientId: data.user.clientId,
            role: data.user.role,
            project: data.user.project || null
          }));
          localStorage.setItem('userRole', data.user.role);
          localStorage.setItem('userId', mappedUser.id);
        } else {
          logout();
        }
      } else {
        // No fallback to local verify if external fails
        console.error('External auth verification failed');
        logout();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('userId', userData.id);
    localStorage.setItem('userInfo', JSON.stringify({
      name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
      empId: userData.empId,
      clientId: userData.clientId,
      role: userData.role,
      project: userData.project || null
    }));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userInfo');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};






