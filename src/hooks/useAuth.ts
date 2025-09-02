import { useState, useEffect, createContext, useContext } from 'react';
import { AuthService } from '../services/authService';
import { SessionManager } from '../utils/sessionManager';
import type { User, AuthState, LoginCredentials, RegisterData } from '../types/auth';

const AuthContext = createContext<{
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
} | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  // Verificar sesión al cargar la aplicación
  const checkSession = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const user = await AuthService.getCurrentUser();
      
      setAuthState({ 
        user, 
        loading: false, 
        error: null 
      });
    } catch (error) {
      console.error('Error checking session:', error);
      setAuthState({ 
        user: null, 
        loading: false, 
        error: 'Error al verificar la sesión' 
      });
    }
  };

  // Función de login
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const result = await AuthService.login(credentials);
      
      if (result.success && result.user) {
        setAuthState({ 
          user: result.user, 
          loading: false, 
          error: null 
        });
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error || 'Error durante el inicio de sesión' 
        }));
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'Error durante el inicio de sesión';
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  };

  // Función de registro
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const result = await AuthService.register(data);
      
      if (result.success && result.user) {
        setAuthState({ 
          user: result.user, 
          loading: false, 
          error: null 
        });
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error || 'Error durante el registro' 
        }));
      }

      return result;
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = 'Error durante el registro';
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  };

  // Función de logout
  const logout = async () => {
    try {
      await AuthService.logout();
      setAuthState({ user: null, loading: false, error: null });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Verificar sesión al montar el componente
  useEffect(() => {
    checkSession();
  }, []);

  // Refrescar sesión cada 30 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      if (authState.user) {
        SessionManager.refreshSession();
      }
    }, 30 * 60 * 1000); // 30 minutos

    return () => clearInterval(interval);
  }, [authState.user]);

  return {
    authState,
    login,
    register,
    logout,
    checkSession
  };
};

export { AuthContext };