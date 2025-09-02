import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../supabaseClient';
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

  // Función para hashear contraseñas usando Web Crypto API
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Verificar sesión al cargar la aplicación
  const checkSession = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const sessionData = localStorage.getItem('melx_session');
      if (!sessionData) {
        setAuthState({ user: null, loading: false, error: null });
        return;
      }

      const { userId, timestamp } = JSON.parse(sessionData);
      
      // Verificar si la sesión ha expirado (24 horas)
      const sessionAge = Date.now() - timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
      
      if (sessionAge > maxAge) {
        localStorage.removeItem('melx_session');
        setAuthState({ user: null, loading: false, error: null });
        return;
      }

      // Verificar que el usuario aún existe en la base de datos
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, name, role, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        localStorage.removeItem('melx_session');
        setAuthState({ user: null, loading: false, error: 'Sesión inválida' });
        return;
      }

      setAuthState({ 
        user: userData as User, 
        loading: false, 
        error: null 
      });
    } catch (error) {
      console.error('Error checking session:', error);
      localStorage.removeItem('melx_session');
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

      const hashedPassword = await hashPassword(credentials.password);

      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, name, role, created_at, updated_at')
        .eq('username', credentials.username)
        .eq('password', hashedPassword)
        .single();

      if (error || !userData) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Credenciales incorrectas' 
        }));
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Crear sesión segura
      const sessionData = {
        userId: userData.id,
        timestamp: Date.now()
      };
      
      localStorage.setItem('melx_session', JSON.stringify(sessionData));

      setAuthState({ 
        user: userData as User, 
        loading: false, 
        error: null 
      });

      return { success: true };
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

      // Verificar si el usuario ya existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', data.username)
        .single();

      if (existingUser) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'El usuario ya existe' 
        }));
        return { success: false, error: 'El usuario ya existe' };
      }

      const hashedPassword = await hashPassword(data.password);

      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          username: data.username,
          password: hashedPassword,
          name: data.name,
          role: data.role || 'admin'
        }])
        .select('id, username, name, role, created_at, updated_at')
        .single();

      if (error || !newUser) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Error al crear el usuario' 
        }));
        return { success: false, error: 'Error al crear el usuario' };
      }

      // Crear sesión automáticamente después del registro
      const sessionData = {
        userId: newUser.id,
        timestamp: Date.now()
      };
      
      localStorage.setItem('melx_session', JSON.stringify(sessionData));

      setAuthState({ 
        user: newUser as User, 
        loading: false, 
        error: null 
      });

      return { success: true };
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
      localStorage.removeItem('melx_session');
      setAuthState({ user: null, loading: false, error: null });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Verificar sesión al montar el componente
  useEffect(() => {
    checkSession();
  }, []);

  return {
    authState,
    login,
    register,
    logout,
    checkSession
  };
};

export { AuthContext };