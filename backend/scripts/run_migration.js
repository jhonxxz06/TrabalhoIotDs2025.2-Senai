#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const sqlArg = process.argv[2];
  const connArg = process.argv[3];

  if (!sqlArg) {
    console.error('Uso: node run_migration.js <path-to-sql-file> [connection-string]');
    process.exit(1);
  }

  const sqlPath = path.resolve(process.cwd(), sqlArg);
  if (!fs.existsSync(sqlPath)) {
    console.error('Arquivo SQL não encontrado:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const connectionString = connArg || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Nenhuma connection string fornecida. Defina DATABASE_URL no .env ou passe como 2º argumento.');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Conectando ao banco...');
    await client.connect();
    console.log('BEGIN');
    await client.query('BEGIN');
    console.log('Executando SQL de migração:', sqlPath);
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migração aplicada com sucesso.');
  } catch (err) {
    console.error('Erro ao aplicar migração:', err);
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback falhou:', e); }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
