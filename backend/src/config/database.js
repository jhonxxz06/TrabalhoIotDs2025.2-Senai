const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/database.sqlite');

let db = null;

// Inicializa o banco de dados
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Verifica se já existe um banco de dados salvo
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Banco de dados carregado do arquivo');
  } else {
    db = new SQL.Database();
    console.log('✅ Novo banco de dados criado');
  }
  
  // Cria as tabelas se não existirem
  createTables();
  
  // Salva o banco após criar as tabelas
  saveDatabase();
  
  return db;
}

// Cria todas as tabelas do sistema
function createTables() {
  // Tabela de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      has_access INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de dispositivos
  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mqtt_broker TEXT NOT NULL,
      mqtt_port TEXT DEFAULT '1883',
      mqtt_topic TEXT NOT NULL,
      mqtt_username TEXT,
      mqtt_password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Relação N:N usuários-dispositivos
  db.run(`
    CREATE TABLE IF NOT EXISTS device_users (
      device_id INTEGER,
      user_id INTEGER,
      PRIMARY KEY (device_id, user_id),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabela de widgets (gráficos)
  db.run(`
    CREATE TABLE IF NOT EXISTS widgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      position TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    )
  `);

  // Tabela de solicitações de acesso
  db.run(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      device_id INTEGER,
      message TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
    )
  `);

  // Tabela de dados MQTT (histórico)
  db.run(`
    CREATE TABLE IF NOT EXISTS mqtt_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      payload TEXT NOT NULL,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Tabelas criadas/verificadas com sucesso');
}

// Salva o banco de dados em arquivo
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    
    // Garante que a pasta database existe
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Retorna a instância do banco
function getDatabase() {
  if (!db) {
    throw new Error('Banco de dados não inicializado. Chame initDatabase() primeiro.');
  }
  return db;
}

// Verifica se o banco está pronto
function ensureDatabase() {
  if (!db) {
    throw new Error('Banco de dados não inicializado. Chame initDatabase() primeiro.');
  }
}

// Executa uma query INSERT/UPDATE/DELETE e salva automaticamente
function run(sql, params = []) {
  ensureDatabase();
  try {
    // sql.js usa exec para queries sem retorno ou prepare para queries com params
    if (params.length > 0) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } else {
      db.exec(sql);
    }
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Erro ao executar query:', sql, params, error.message);
    throw error;
  }
}

// Executa uma query SELECT e retorna os resultados
function query(sql, params = []) {
  ensureDatabase();
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    
    return results;
  } catch (error) {
    console.error('Erro ao executar query:', sql, params, error);
    throw error;
  }
}

// Executa uma query SELECT e retorna apenas o primeiro resultado
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Retorna o último ID inserido
function lastInsertRowId() {
  ensureDatabase();
  try {
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return result.id;
  } catch (error) {
    console.error('Erro ao buscar lastInsertRowId:', error.message);
    return null;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  saveDatabase,
  run,
  query,
  queryOne,
  lastInsertRowId
};
