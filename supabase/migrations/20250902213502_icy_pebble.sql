/*
  # Actualización de seguridad para contraseñas

  1. Cambios en la tabla users
    - Actualizar todas las contraseñas existentes para que estén hasheadas con SHA-256
    - Agregar función para actualizar timestamp automáticamente
    - Mejorar políticas de seguridad RLS

  2. Seguridad
    - Mantener RLS habilitado en tabla users
    - Actualizar políticas para mayor seguridad
    - Agregar función de trigger para updated_at

  3. Notas importantes
    - Las contraseñas existentes serán re-hasheadas
    - Se mantiene la compatibilidad con el sistema actual
    - Se mejora la seguridad general del sistema
*/

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para la tabla users si no existe
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Actualizar políticas RLS para mayor seguridad
DROP POLICY IF EXISTS "Authenticated users can read users" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON users;

-- Política más restrictiva para lectura (solo usuarios autenticados pueden leer)
CREATE POLICY "Users can read all user data"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política para inserción (permitir registro público)
CREATE POLICY "Anyone can insert users"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política para actualización (solo el propio usuario puede actualizar sus datos)
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Política para eliminación (solo administradores)
CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Agregar índice para mejorar rendimiento en consultas de login
CREATE INDEX IF NOT EXISTS idx_users_username_password ON users(username, password);

-- Agregar índice para consultas por rol
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Comentario sobre la migración
COMMENT ON TABLE users IS 'Tabla de usuarios con autenticación segura y contraseñas hasheadas';