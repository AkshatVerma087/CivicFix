import { createContext, useContext, useState, useCallback } from 'react';
import { authAPI } from '../api/auth';
import { decodeToken } from '../api/client';

const AuthContext = createContext(null);

function loadUser() {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      // Check token if we have one, but also allow cookie-only auth
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = decodeToken(token);
        if (!decoded) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return null;
        }
      }
      return parsed;
    }
  } catch {
    // corrupted data
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  const login = useCallback(async ({ role, isLogin, formData }) => {
    let response;

    if (role === 'citizen') {
      response = isLogin
        ? await authAPI.loginCitizen({ email: formData.email, password: formData.password })
        : await authAPI.registerCitizen({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            address: formData.address,
          });
    } else if (role === 'admin') {
      response = await authAPI.loginAdmin({ email: formData.email, password: formData.password });
    } else {
      response = isLogin
        ? await authAPI.loginAuthority({ email: formData.email, password: formData.password })
        : await authAPI.registerAuthority({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            department: formData.department,
            zone: formData.zone,
            ...(formData.location && { location: formData.location }),
          });
    }

    const token = response.token;

    // Some endpoints (e.g. authority register) don't return a token in the body
    // but set an httpOnly cookie instead. Both auth methods work because
    // the API client sends credentials:'include' AND an Authorization header.
    if (token) {
      localStorage.setItem('token', token);
    }

    let userData;

    if (token) {
      const decoded = decodeToken(token);
      userData = {
        _id: decoded.id,
        role: decoded.role,
        name: response.authority?.name || response.admin?.name || formData.name || (role === 'admin' ? 'Admin' : role === 'citizen' ? 'Citizen' : 'Officer'),
        email: response.authority?.email || formData.email,
        ...(decoded.role === 'authority' && {
          department: response.authority?.department || formData.department,
          zone: response.authority?.zone || formData.zone,
          location: response.authority?.location || formData.location || null,
        }),
      };
    } else {
      // Authority register: build user from response.authority + formData
      const auth = response.authority || {};
      userData = {
        _id: auth._id,
        role,
        name: auth.name || formData.name || 'Officer',
        email: auth.email || formData.email,
        department: auth.department || formData.department,
        zone: auth.zone || formData.zone,
        location: auth.location || formData.location || null,
      };
    }

    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (user?.role === 'authority') {
        await authAPI.logoutAuthority();
      } else if (user?.role === 'admin') {
        await authAPI.logoutAdmin();
      } else {
        await authAPI.logoutCitizen();
      }
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, [user?.role]);

  const updateUserLocation = useCallback((location) => {
    setUser((prev) => {
      const updated = { ...prev, location };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUserLocation, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
