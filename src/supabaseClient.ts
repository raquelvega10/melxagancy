import { createClient } from '@supabase/supabase-js';

// Reemplaza estos valores con tu URL y clave de Supabase
const supabaseUrl = 'https://rffyexevbvhahnahlnho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZnlleGV2YnZoYWhuYWhsbmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTg2MjMsImV4cCI6MjA3MjM5NDYyM30.g1TzzzgtUcL1SYCRPDViC7DxIAPP7O4C1QDnEJs7QpM';

export const supabase = createClient(supabaseUrl, supabaseKey);
    

// Función para comprobar la conexión a Supabase
export async function testSupabaseConnection() {
  // Cambia 'test' por el nombre de una tabla existente si es necesario
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error de conexión a Supabase:', error.message);
     alert('desconexión a Supabase:');
    return false;
  }
  console.log('Conexión exitosa. Datos:', data);
  alert('conexión a Supabase:');
  return true;
}
