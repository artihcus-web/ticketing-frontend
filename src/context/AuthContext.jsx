import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const AuthContext = createContext(null);

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
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setIsAuthenticated(false);
        return;
      }

      // Verify token with backend
      const response = await apiRequest('/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Update localStorage with latest user info
        localStorage.setItem('userInfo', JSON.stringify({
          name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() || response.user.email,
          empId: response.user.empId,
          clientId: response.user.clientId,
          role: response.user.role,
          project: response.user.project || null
        }));
        localStorage.setItem('userRole', response.user.role);
        localStorage.setItem('userId', response.user.id);
      } else {
        // Token invalid, clear storage
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




