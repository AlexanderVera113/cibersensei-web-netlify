// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// Lee las variables seguras desde el archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Comprobación de seguridad: si las llaves no cargan, falla ruidosamente
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Error: Las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidas. Asegúrate de tener un archivo .env en la raíz del proyecto.");
}

// Exporta el cliente de Supabase para que lo use el resto de tu app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)