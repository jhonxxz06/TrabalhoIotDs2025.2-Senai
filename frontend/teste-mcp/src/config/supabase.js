// ============================================
// ✅ CONFIGURAÇÃO SUPABASE - FRONTEND (#4)
// ============================================
// CRÍTICO: Usar ANON key no frontend!
// Esta chave é PÚBLICA e limitada por RLS.
// Nunca use service_role key no frontend!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// ✅ Validação
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERRO: SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios!');
  console.error('Configure no arquivo .env:');
  console.error('  REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('  REACT_APP_SUPABASE_ANON_KEY=eyJ... (anon key)');
}

// ✅ Cliente Supabase para frontend (usa anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Log de inicialização
console.log('✅ Supabase configurado (anon key)');
console.log(`📡 URL: ${supabaseUrl}`);
