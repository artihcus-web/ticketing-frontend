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

      // Verify token with OUR backend
      const apiURL = import.meta.env.VITE_API_BASE_URL || '';
      const verifyUrl = `${apiURL.replace(/\/+$/, '')}/auth/verify`;

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
          const mappedUser = {
            id: data.user.id || data.user._id,
            email: data.user.email,
            role: data.user.role,
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
            role: data.user.role,
            project: data.user.project || null
          }));
          localStorage.setItem('userRole', data.user.role);
          localStorage.setItem('userId', mappedUser.id);
        } else {
          logout();
        }
      } else {
        console.error('Core auth verification failed via backend');
        logout();
      }
    } catch (error) {
      console.error('Auth verification crash:', error);
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






