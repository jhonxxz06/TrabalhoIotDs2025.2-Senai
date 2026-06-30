const { Pool } = require('pg');
require('dotenv').config();

// Cria o pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Garantir que cada conexão do pool use o fuso de Brasília para exibição
pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'America/Sao_Paulo'").catch(() => {});
});
// Trata erros de conexão
pool.on('error', (err) => {
  console.error('❌ Erro não esperado no pool de conexões:', err);
  process.exit(-1);
});

// Inicializa o banco de dados
async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado ao banco PostgreSQL com sucesso');
    
    // Cria as tabelas se não existirem
    await createTables(client);
    
    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    process.exit(-1);
  }
}

// Cria todas as tabelas do sistema
async function createTables(client) {
  try {
    // Tabela de planos SaaS (deve existir antes de domains para a FK funcionar)
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        name                VARCHAR(20) PRIMARY KEY,
        max_users           INTEGER     NOT NULL,
        max_devices         INTEGER     NOT NULL,
        has_overage_tables  BOOLEAN     NOT NULL DEFAULT false,
        has_notifications   BOOLEAN     NOT NULL DEFAULT false
      )
    `);
    await client.query(`
      INSERT INTO plans (name, max_users, max_devices, has_overage_tables, has_notifications)
      VALUES
        ('gratuito',    2,  3,  false, false),
        ('comercial',   5,  10, true,  false),
        ('empresarial', 25, 50, true,  true)
      ON CONFLICT (name) DO NOTHING
    `);

    // Tabela de domínios (deve ser criada antes de users e devices)
    await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        admin_id INTEGER,
        plan VARCHAR(20) DEFAULT 'gratuito' REFERENCES plans(name),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migração segura: adiciona plan em domains se já existir a tabela sem a coluna
    await client.query(`
      ALTER TABLE domains ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'gratuito' REFERENCES plans(name)
    `);

    // Tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
        has_access BOOLEAN DEFAULT false,
        domain_id INTEGER DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migração segura: adiciona domain_id em users se já existir a tabela sem a coluna
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS domain_id INTEGER DEFAULT NULL
    `);

    // Tabela de dispositivos
    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        mqtt_broker TEXT NOT NULL,
        mqtt_port TEXT DEFAULT '1883',
        mqtt_topic TEXT NOT NULL,
        mqtt_username TEXT,
        mqtt_password TEXT,
        domain_id INTEGER DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migração segura: adiciona domain_id em devices se já existir a tabela sem a coluna
    await client.query(`
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS domain_id INTEGER DEFAULT NULL
    `);

    // Relação N:N usuários-dispositivos
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_users (
        device_id INTEGER,
        user_id INTEGER,
        PRIMARY KEY (device_id, user_id),
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tabela de widgets (gráficos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS widgets (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config JSONB DEFAULT '{}',
        position JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      )
    `);

    // Tabela de solicitações de acesso
    await client.query(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        device_id INTEGER,
        message TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
      )
    `);

    // Tabela de dados MQTT (histórico)
    // Usar timestamptz para armazenar instantes com zona UTC
    await client.query(`
      CREATE TABLE IF NOT EXISTS mqtt_data (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL,
        topic TEXT NOT NULL,
        payload JSONB NOT NULL,
        received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      )
    `);

    // Contadores de excedências por widget + campo (notificações Telegram)
    await client.query(`
      CREATE TABLE IF NOT EXISTS exceedance_counters (
        id SERIAL PRIMARY KEY,
        widget_id INTEGER NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
        field_name TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(widget_id, field_name)
      )
    `);

    // Log de notificações enviadas (Telegram e futuros canais)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id SERIAL PRIMARY KEY,
        domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL,
        device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
        widget_id INTEGER REFERENCES widgets(id) ON DELETE SET NULL,
        field_name TEXT NOT NULL,
        value_read NUMERIC,
        threshold_value NUMERIC,
        threshold_type TEXT,
        channel TEXT NOT NULL DEFAULT 'telegram',
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        message_sent TEXT
      )
    `);

    // Adiciona FK de admin_id em domains → users (após ambas as tabelas existirem)
    // Feita como ALTER para ser segura em caso de re-execução
    try {
      await client.query(`
        ALTER TABLE domains
          ADD CONSTRAINT IF NOT EXISTS fk_domains_admin
          FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
      `);
    } catch (_) {
      // constraint já existe — ignorar
    }

    // FK domain_id em users → domains
    try {
      await client.query(`
        ALTER TABLE users
          ADD CONSTRAINT IF NOT EXISTS fk_users_domain
          FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE SET NULL
      `);
    } catch (_) {
      // constraint já existe — ignorar
    }

    // FK domain_id em devices → domains
    try {
      await client.query(`
        ALTER TABLE devices
          ADD CONSTRAINT IF NOT EXISTS fk_devices_domain
          FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE SET NULL
      `);
    } catch (_) {
      // constraint já existe — ignorar
    }

    // Configuração Telegram por domínio (relação 0..1)
    await client.query(`
      CREATE TABLE IF NOT EXISTS domain_telegram_configs (
        domain_id               INTEGER PRIMARY KEY
                                REFERENCES domains(id) ON DELETE CASCADE,
        chat_id                 TEXT,
        chat_name               VARCHAR(255),
        enabled                 BOOLEAN NOT NULL DEFAULT false,
        verification_code       VARCHAR(10),
        verification_expires_at TIMESTAMPTZ
      )
    `);
    // Migrações seguras: garante colunas de verificação mesmo em bancos criados antes delas existirem
    await client.query(`ALTER TABLE domain_telegram_configs ADD COLUMN IF NOT EXISTS chat_name VARCHAR(255)`);
    await client.query(`ALTER TABLE domain_telegram_configs ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10)`);
    await client.query(`ALTER TABLE domain_telegram_configs ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ`);

    console.log('Tabelas criadas/verificadas com sucesso (incluindo domínios)');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error.message);
    throw error;
  }
}

// Retorna a instância do pool
function getDatabase() {
  return pool;
}

// Executa uma query INSERT/UPDATE/DELETE/SELECT
async function run(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (error) {
    console.error('Erro ao executar query:', sql, params, error.message);
    throw error;
  }
}

// Executa uma query SELECT e retorna os resultados
async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Erro ao executar query:', sql, params, error.message);
    throw error;
  }
}

// Executa uma query SELECT e retorna apenas o primeiro resultado
async function queryOne(sql, params = []) {
  try {
    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Erro ao executar queryOne:', sql, params, error.message);
    throw error;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  run,
  query,
  queryOne,
  pool
};
