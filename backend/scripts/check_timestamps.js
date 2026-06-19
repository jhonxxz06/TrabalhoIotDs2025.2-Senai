#!/usr/bin/env node
require('dotenv').config();
const { query, pool } = require('../src/config/database');

async function main() {
  const limit = parseInt(process.argv[2], 10) || 5;

  const sql = `SELECT id, payload, received_at, pg_typeof(received_at) AS tipo
    FROM mqtt_data
    ORDER BY received_at DESC
    LIMIT $1`;

  try {
    const rows = await query(sql, [limit]);
    if (!rows || rows.length === 0) {
      console.log('Nenhum registro encontrado.');
      await pool.end();
      return;
    }

    console.log(`Mostrando ${rows.length} registros (mais recentes primeiro):\n`);
    rows.forEach(r => {
      const receivedAt = r.received_at ? new Date(r.received_at) : null;
      const brasilia = receivedAt
        ? receivedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : 'NULL';
      console.log(`${r.id} | tipo=${r.tipo} | brasília=${brasilia} | raw=${r.received_at} | payload=${r.payload}`);
    });

    await pool.end();
  } catch (err) {
    console.error('Erro ao consultar mqtt_data:', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

main();
