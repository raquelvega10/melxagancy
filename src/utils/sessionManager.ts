import { supabase } from '../supabaseClient';

export interface SessionData {
  userId: string;
  timestamp: number;
}

export class SessionManager {
  private static readonly SESSION_KEY = 'melx_session';
  private static readonly MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

  static createSession(userId: string): void {
    const sessionData: SessionData = {
      userId,
      timestamp: Date.now()
    };
    
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
  }

  static getSession(): SessionData | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;

      const parsed: SessionData = JSON.parse(sessionData);
      
      // Verificar si la sesión ha expirado
      if (Date.now() - parsed.timestamp > this.MAX_AGE) {
        this.clearSession();
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing session data:', error);
      this.clearSession();
      return null;
    }
  }

  static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  static async validateSession(): Promise<boolean> {
    const session = this.getSession();
    if (!session) return false;

    try {
      // Verificar que el usuario aún existe en la base de datos
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.userId)
        .single();

      if (error || !data) {
        this.clearSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      this.clearSession();
      return false;
    }
  }

  static refreshSession(): void {
    const session = this.getSession();
    if (session) {
      this.createSession(session.userId);
    }
  }
}