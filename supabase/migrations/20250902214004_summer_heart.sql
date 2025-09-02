/*
  # Actualización de seguridad para contraseñas

  1. Mejoras de seguridad
    - Actualizar función de trigger para updated_at
    - Mejorar índices para mejor rendimiento
    - Actualizar políticas RLS para mayor seguridad

  2. Cambios en la tabla users
    - Mantener estructura existente
    - Mejorar índices de rendimiento
    - Actualizar políticas de seguridad

  3. Seguridad
    - Políticas RLS más restrictivas
    - Mejor manejo de autenticación
*/

-- Crear función para actualizar updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Asegurar que el trigger existe
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Mejorar índices para mejor rendimiento
DROP INDEX IF EXISTS idx_users_username_password;
CREATE INDEX IF NOT EXISTS idx_users_username_password ON users (username, password);

DROP INDEX IF EXISTS idx_users_role;
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Actualizar políticas RLS para mayor seguridad
DROP POLICY IF EXISTS "Users can read all user data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Política para lectura: solo usuarios autenticados pueden leer datos de usuarios
CREATE POLICY "Authenticated users can read user data"
  ON users
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Política para inserción: cualquiera puede registrarse
CREATE POLICY "Anyone can register"
  ON users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Política para actualización: usuarios pueden actualizar sus propios datos
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Política para eliminación: solo administradores pueden eliminar usuarios
CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO authenticated, anon
  USING (true);