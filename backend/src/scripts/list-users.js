const { initDatabase, query } = require('../config/database');

async function listUsers() {
  try {
    await initDatabase();

    const users = await query(
      'SELECT id, username, email, role, has_access, created_at FROM users ORDER BY id'
    );

    console.log('\n🔎 Usuários no banco de dados:');
    console.table(users);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    process.exit(1);
  }
}

listUsers();
