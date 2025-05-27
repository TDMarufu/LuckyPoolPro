import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { queryClient } from './queryClient';

interface User {
  id: number;
  username: string;
  email: string;
  points: number;
  totalWins: number;
  totalGames: number;
  totalEarnings: number;
  loginStreak: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Load auth state from localStorage on mount
    const savedToken = localStorage.getItem('nplay_token');
    const savedUser = localStorage.getItem('nplay_user');
    
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('nplay_token');
        localStorage.removeItem('nplay_user');
      }
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('nplay_token', newToken);
    localStorage.setItem('nplay_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('nplay_token');
    localStorage.removeItem('nplay_user');
    queryClient.clear();
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('nplay_user', JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Update the query client to include auth headers
import { queryClient as originalQueryClient } from './queryClient';

// Override the default query function to include auth headers
originalQueryClient.setDefaultOptions({
  queries: {
    queryFn: async ({ queryKey }) => {
      const token = localStorage.getItem('nplay_token');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers,
      });

      if (res.status === 401) {
        // Token expired or invalid, logout user
        localStorage.removeItem('nplay_token');
        localStorage.removeItem('nplay_user');
        window.location.href = '/auth';
        throw new Error('Authentication required');
      }

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return await res.json();
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: false,
  },
  mutations: {
    retry: false,
  },
});
