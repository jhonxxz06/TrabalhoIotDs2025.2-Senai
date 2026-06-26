require('dotenv').config();
const { pool, initDatabase } = require('../config/database');

async function check() {
  await initDatabase();
  const client = await pool.connect();
  try {
    // Migration 1: has_access deve ser boolean
    const { rows: [col1] } = await client.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'has_access'
    `);
    console.log('has_access type:', col1?.data_type, col1?.data_type === 'boolean' ? '✅' : '❌ esperado: boolean');

    // Migration 2: widgets.config deve ser jsonb
    const { rows: [col2] } = await client.query(`
      SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'widgets' AND column_name = 'config'
    `);
    console.log('widgets.config type:', col2?.udt_name, col2?.udt_name === 'jsonb' ? '✅' : '❌ esperado: jsonb');

    // Migration 2: mqtt_data.payload deve ser jsonb
    const { rows: [col3] } = await client.query(`
      SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'mqtt_data' AND column_name = 'payload'
    `);
    console.log('mqtt_data.payload type:', col3?.udt_name, col3?.udt_name === 'jsonb' ? '✅' : '❌ esperado: jsonb');

    // Migration 3: domain_telegram_configs deve existir
    const { rows: [tbl] } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'domain_telegram_configs'
    `);
    console.log('domain_telegram_configs:', tbl ? '✅ existe' : '❌ não encontrada');

    // Migration 3: colunas telegram_* não devem existir em domains
    const { rows: legacyCols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'domains' AND column_name LIKE 'telegram%'
    `);
    console.log(
      'colunas telegram_* em domains:',
      legacyCols.length === 0 ? '✅ removidas' : `❌ ainda existem: ${legacyCols.map(r => r.column_name).join(', ')}`
    );

    // Migration 4: tabela plans deve ter 3 linhas
    const { rows: plans } = await client.query('SELECT name FROM plans ORDER BY name');
    console.log('plans:', plans.map(p => p.name), plans.length === 3 ? '✅' : '❌ esperado 3 planos');

    // Integridade: sem has_access NULL
    const { rows: [nullAccess] } = await client.query(
      `SELECT COUNT(*)::int AS c FROM users WHERE has_access IS NULL`
    );
    console.log('users com has_access NULL:', nullAccess.c, nullAccess.c === 0 ? '✅' : '❌');

    // Integridade: sem widget.config NULL
    const { rows: [nullConfig] } = await client.query(
      `SELECT COUNT(*)::int AS c FROM widgets WHERE config IS NULL`
    );
    console.log('widgets com config NULL:', nullConfig.c, nullConfig.c === 0 ? '✅' : '❌');

    console.log('\nVerificação concluída.');
  } finally {
    client.release();
    pool.end();
  }
}

check().catch(err => {
  console.error('Erro na verificação:', err.message);
  process.exit(1);
});
