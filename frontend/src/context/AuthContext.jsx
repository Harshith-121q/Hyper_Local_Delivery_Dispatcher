import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axiosInstance.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('Failed to load user info', err);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const normalizedEmail = email?.trim().toLowerCase();
      const res = await axiosInstance.post('/auth/login', { email: normalizedEmail, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Server error during login'
      };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const normalizedEmail = email?.trim().toLowerCase();
      const normalizedName = name?.trim();
      const res = await axiosInstance.post('/auth/register', {
        name: normalizedName,
        email: normalizedEmail,
        password,
        role
      });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Registration failed' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Server error during registration'
      };
    }
  };

  const updateLocation = async (location) => {
    try {
      const res = await axiosInstance.put('/auth/location', { location });
      if (res.data.success) {
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.data.message || 'Location update failed' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Server error while updating location'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateLocation, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
