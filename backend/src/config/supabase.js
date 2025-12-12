// ============================================
// ✅ CONFIGURAÇÃO SUPABASE - BACKEND (#4)
// ============================================
// CRÍTICO: Usar SERVICE_ROLE key no backend!
// Esta chave IGNORA RLS e tem acesso total.
// NUNCA expor esta chave no frontend!

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// ✅ Validação obrigatória
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO CRÍTICO: SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios!');
  console.error('Configure no arquivo .env:');
  console.error('  SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('  SUPABASE_SERVICE_KEY=eyJ... (service_role key)');
  process.exit(1);
}

// ✅ Cliente Supabase para backend (usa service_role)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Log de inicialização
console.log('✅ Supabase configurado (service_role)');
console.log(`📡 URL: ${supabaseUrl}`);

module.exports = { supabase };
