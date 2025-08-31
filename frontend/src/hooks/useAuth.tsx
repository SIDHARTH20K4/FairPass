import { useState, useEffect, createContext, useContext } from 'react';

type Organization = {
  id: string;
  address: string;
  name: string;
  email?: string;
  description?: string;
};

type AuthContextType = {
  organization: Organization | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithWallet: (address: string) => Promise<boolean>;
  signUp: (address: string, name: string, email?: string, password?: string, description?: string) => Promise<boolean>;
  signOut: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('auth-token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth-token');
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    try {
      console.log('Frontend: Attempting signin with:', { email, password: password ? '[HIDDEN]' : 'undefined' });
      
      const response = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('Frontend: Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Frontend: Signin successful, organization:', data.organization);
        localStorage.setItem('auth-token', data.token);
        setOrganization(data.organization);
        return true;
      } else {
        const error = await response.json();
        console.log('Frontend: Signin failed with error:', error);
        alert(error.error || 'Sign in failed');
        return false;
      }
    } catch (error) {
      console.error('Frontend: Signin error:', error);
      alert('Sign in failed');
      return false;
    }
  }

  async function signInWithWallet(address: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth-token', data.token);
        setOrganization(data.organization);
        return true;
      } else {
        const error = await response.json();
        alert(error.error || 'Sign in failed');
        return false;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed');
      return false;
    }
  }

  async function signUp(address: string, name: string, email?: string, password?: string, description?: string): Promise<boolean> {
    try {
      // Ensure address is always provided
      if (!address) {
        alert('Wallet address is required for registration');
        return false;
      }

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, name, email, password, description }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth-token', data.token);
        setOrganization(data.organization);
        return true;
      } else {
        const error = await response.json();
        alert(error.error || 'Registration failed');
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
      return false;
    }
  }

  function signOut() {
    localStorage.removeItem('auth-token');
    setOrganization(null);
  }

  const value: AuthContextType = {
    organization,
    loading,
    signIn,
    signInWithWallet,
    signUp,
    signOut,
    isAuthenticated: !!organization,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
