require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDatabase, run, query } = require('./config/database');

const users = [
  {
    username: 'Administrador',
    email: 'admin@teste.com',
    password: 'admin123',
    role: 'admin',
    has_access: 1
  }
];

async function seed() {
  try {
    // Inicializa o banco de dados
    await initDatabase();
    
    console.log('\n🌱 Iniciando seed de usuários...\n');
    
    let created = 0;
    
    for (const user of users) {
      // Verifica se o usuário já existe
      const existing = await query('SELECT id FROM users WHERE email = $1', [user.email]);
      
      if (existing.length > 0) {
        console.log(`⚠️  Usuário já existe: ${user.email}`);
        continue;
      }
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Insere o usuário
      await run(`
        INSERT INTO users (username, email, password, role, has_access)
        VALUES ($1, $2, $3, $4, $5)
      `, [user.username, user.email, hashedPassword, user.role, user.has_access]);
      
      const accessStatus = user.has_access ? 'com acesso' : 'sem acesso';
      console.log(`✅ Usuário criado: ${user.email} (${user.role} - ${accessStatus})`);
      created++;
    }
    
    console.log(`\n🎉 Seed concluído! ${created} usuário(s) criado(s).\n`);
    
    // Lista todos os usuários
    const allUsers = await query('SELECT id, username, email, role, has_access FROM users');
    console.log('📋 Usuários no banco:');
    console.table(allUsers);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  }
}

seed();
