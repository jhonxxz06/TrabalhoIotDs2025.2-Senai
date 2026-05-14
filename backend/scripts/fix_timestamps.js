#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();

    // Detect affected rows
    const detectSql = `SELECT COUNT(*)::int AS cnt FROM mqtt_data WHERE received_at_backup IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (received_at - received_at_backup))/3600) >= 2.5`;
    const detectRes = await client.query(detectSql);
    const count = detectRes.rows[0].cnt;

    console.log('Registros detectados para correção:', count);
    if (count === 0) {
      console.log('Nenhum registro precisa de correção. Saindo.');
      await client.end();
      process.exit(0);
    }

    // Create backup table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS mqtt_data_fix_backup AS
      TABLE mqtt_data WITH NO DATA;
    `);

    // Insert affected rows into backup table
    await client.query(`
      INSERT INTO mqtt_data_fix_backup
      SELECT *, now() AS backup_applied_at
      FROM mqtt_data
      WHERE received_at_backup IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (received_at - received_at_backup))/3600) >= 2.5;
    `);

    console.log('Backup criado em tabela `mqtt_data_fix_backup` (linhas inseridas).');

    // Update affected rows inside transaction
    await client.query('BEGIN');
    const updateRes = await client.query(`
      UPDATE mqtt_data
      SET received_at = received_at + interval '3 hours'
      WHERE received_at_backup IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (received_at - received_at_backup))/3600) >= 2.5
      RETURNING id, received_at, received_at_backup;
    `);
    await client.query('COMMIT');

    console.log('Atualizações aplicadas. Total atualizado:', updateRes.rowCount);
    console.dir(updateRes.rows.slice(0, 10), { depth: 3 });

    // Show a few post-update checks formatted
    const checkRes = await client.query(`
      SELECT id, to_char(received_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS') AS received_utc, to_char(received_at AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI:SS') AS received_brasilia
      FROM mqtt_data
      WHERE received_at_backup IS NOT NULL
      ORDER BY id DESC
      LIMIT 10;
    `);
    console.log('Amostra pós-correção (UTC / Brasília):');
    console.dir(checkRes.rows, { depth: 3 });

    await client.end();
    process.exit(0);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch(e){}
    console.error('Erro durante correção:', err);
    await client.end();
    process.exit(1);
  }
})();
