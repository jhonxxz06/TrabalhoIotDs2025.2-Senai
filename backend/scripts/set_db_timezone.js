#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in environment or .env');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const dbRes = await client.query('SELECT current_database()');
    const dbName = dbRes.rows[0].current_database;
    console.log('Current database:', dbName);

    try {
      console.log(`Trying: ALTER DATABASE "${dbName}" SET timezone TO 'America/Sao_Paulo'`);
      await client.query(`ALTER DATABASE "${dbName}" SET timezone TO 'America/Sao_Paulo'`);
      console.log('SUCCESS: database timezone set');
      process.exit(0);
    } catch (err) {
      console.error('ALTER DATABASE failed:', err.message);
      // try alter role
      const roleRes = await client.query('SELECT current_user');
      const role = roleRes.rows[0].current_user;
      console.log('Attempting ALTER ROLE for current user:', role);
      try {
        await client.query(`ALTER ROLE "${role}" SET timezone TO 'America/Sao_Paulo'`);
        console.log('SUCCESS: role timezone set');
        process.exit(0);
      } catch (err2) {
        console.error('ALTER ROLE failed:', err2.message);
        process.exit(2);
      }
    }
  } catch (err) {
    console.error('Connection/query error:', err.message);
    process.exit(3);
  } finally {
    try { await client.end(); } catch(e){}
  }
})();
