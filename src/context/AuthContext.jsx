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
  const [user, setUser] = useState(() => {
    const savedInfo = localStorage.getItem('userInfo');
    return savedInfo ? JSON.parse(savedInfo) : null;
  });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });

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

      // Verify token with OUR backend
      const apiURL = import.meta.env.VITE_API_BASE_URL || '';
      const verifyUrl = `${apiURL.replace(/\/+$/, '')}/api/auth/verify`;

      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          // Use the user data returned by our backend
          const normalizedRole = data.user.role?.toLowerCase().trim().replace(/\s+/g, '_');
          const mappedUser = {
            id: data.user.id || data.user._id,
            email: data.user.email,
            role: normalizedRole,
            empId: data.user.empId || data.user.userName,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            fullName: data.user.fullName || `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim()
          };

          setUser(mappedUser);
          setIsAuthenticated(true);

          localStorage.setItem('userInfo', JSON.stringify({
            name: mappedUser.fullName || data.user.email,
            empId: mappedUser.empId,
            clientId: data.user.clientId,
            role: normalizedRole,
            project: data.user.project || null
          }));
          localStorage.setItem('userRole', normalizedRole);
          localStorage.setItem('userId', mappedUser.id);
        } else {
          // No user data but OK response? Unusual.
          logout();
        }
      } else if (response.status === 401 || response.status === 403) {
        console.error(`Auth verification failed: ${response.status}`);
        logout();
      } else {
        console.warn(`Auth verification backend error: ${response.status}. Keeping local state.`);
        // Don't call logout() for 500s/503s - the user might still have a valid session
        // and we don't want to kick them out because of a temporary server glitch.
      }
    } catch (error) {
      console.error('Auth verification network crash:', error);
      // Don't call logout() for network errors on refresh
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    const normalizedRole = userData.role?.toLowerCase().trim().replace(/\s+/g, '_');
    const normalizedUserData = { ...userData, role: normalizedRole };

    localStorage.setItem('token', token);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', normalizedRole);
    localStorage.setItem('userId', userData.id);
    localStorage.setItem('userInfo', JSON.stringify({
      name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
      empId: userData.empId,
      clientId: userData.clientId,
      role: normalizedRole,
      project: userData.project || null
    }));
    setUser(normalizedUserData);
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






