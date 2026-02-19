import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        // isAdmin 속성 보정
        parsedUser.isAdmin = parsedUser.role === 'admin';
        setUser(parsedUser);
      } catch (e) {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const setAuth = (newToken: string, newUser: User) => {
    // isAdmin 속성 보정
    const userToSave = { ...newUser, isAdmin: newUser.role === 'admin' };
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userToSave));
    setToken(newToken);
    setUser(userToSave);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = useMemo(() => !!token, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider context error');
  return context;
};