import { supabase } from '../supabaseClient';
import { PasswordUtils } from '../utils/passwordUtils';
import { SessionManager } from '../utils/sessionManager';
import type { User, LoginCredentials, RegisterData } from '../types/auth';

export class AuthService {
  /**
   * Autentica un usuario con username y contraseña
   */
  static async login(credentials: LoginCredentials): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      // Validar entrada
      if (!credentials.username || !credentials.password) {
        return { success: false, error: 'Username y contraseña son requeridos' };
      }

      // Hashear la contraseña para compararla
      const hashedPassword = await PasswordUtils.hashPassword(credentials.password);

      // Buscar usuario en la base de datos
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, name, role, created_at, updated_at')
        .eq('username', credentials.username)
        .eq('password', hashedPassword)
        .single();

      if (error || !userData) {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Crear sesión
      SessionManager.createSession(userData.id);

      // Actualizar timestamp de último acceso
      await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', userData.id);

      return { 
        success: true, 
        user: userData as User 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Error interno del servidor' 
      };
    }
  }

  /**
   * Registra un nuevo usuario
   */
  static async register(data: RegisterData): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      // Validar entrada
      if (!data.username || !data.password || !data.name) {
        return { 
          success: false, 
          error: 'Username, contraseña y nombre son requeridos' 
        };
      }

      // Validar fortaleza de la contraseña
      const passwordValidation = PasswordUtils.validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        return { 
          success: false, 
          error: passwordValidation.errors.join('. ') 
        };
      }

      // Verificar si el usuario ya existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', data.username)
        .single();

      if (existingUser) {
        return { success: false, error: 'El usuario ya existe' };
      }

      // Hashear la contraseña
      const hashedPassword = await PasswordUtils.hashPassword(data.password);

      // Crear nuevo usuario
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
        return { success: false, error: 'Error al crear el usuario' };
      }

      // Crear sesión automáticamente
      SessionManager.createSession(newUser.id);

      return { 
        success: true, 
        user: newUser as User 
      };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: 'Error interno del servidor' 
      };
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  static async logout(): Promise<void> {
    SessionManager.clearSession();
  }

  /**
   * Obtiene el usuario actual de la sesión
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const session = SessionManager.getSession();
      if (!session) return null;

      const isValid = await SessionManager.validateSession();
      if (!isValid) return null;

      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, name, role, created_at, updated_at')
        .eq('id', session.userId)
        .single();

      if (error || !userData) {
        SessionManager.clearSession();
        return null;
      }

      return userData as User;
    } catch (error) {
      console.error('Get current user error:', error);
      SessionManager.clearSession();
      return null;
    }
  }

  /**
   * Cambia la contraseña del usuario actual
   */
  static async changePassword(
    currentPassword: string, 
    newPassword: string, 
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validar contraseña actual
      const hashedCurrentPassword = await PasswordUtils.hashPassword(currentPassword);
      
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('password', hashedCurrentPassword)
        .single();

      if (!userData) {
        return { success: false, error: 'Contraseña actual incorrecta' };
      }

      // Validar nueva contraseña
      const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return { 
          success: false, 
          error: passwordValidation.errors.join('. ') 
        };
      }

      // Actualizar contraseña
      const hashedNewPassword = await PasswordUtils.hashPassword(newPassword);
      
      const { error } = await supabase
        .from('users')
        .update({ 
          password: hashedNewPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        return { success: false, error: 'Error al actualizar la contraseña' };
      }

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }
}