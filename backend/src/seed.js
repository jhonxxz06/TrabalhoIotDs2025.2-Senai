require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDatabase, run, query } = require('./config/database');
const Domain = require('./models/Domain');

// Cada usuário admin precisa de um domínio próprio (sistema é multi-tenant:
// todo usuário deve pertencer a um domain_id válido para conseguir logar).
const users = [
  {
    username: 'Administrador',
    email: 'admin@teste.com',
    password: 'admin123',
    role: 'admin',
    has_access: true,
    domain: {
      name: 'Senai Lauro',
      code: 'SenaiLauro123'
    }
  }
];

async function seed() {
  try {
    // Inicializa o banco de dados
    await initDatabase();

    console.log('\n Iniciando seed de usuários...\n');

    let created = 0;

    for (const user of users) {
      // Verifica se o usuário já existe
      const existing = await query('SELECT id FROM users WHERE email = $1', [user.email]);

      if (existing.length > 0) {
        console.log(`  Usuário já existe: ${user.email}`);
        continue;
      }

      // Garante que o domínio do usuário exista
      let domain = await Domain.findByCode(user.domain.code);
      if (!domain) {
        domain = await Domain.create(user.domain.name, user.domain.code, null);
        console.log(` Domínio criado: ${user.domain.name} (código: ${user.domain.code})`);
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Insere o usuário já vinculado ao domínio
      await run(`
        INSERT INTO users (username, email, password, role, has_access, domain_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [user.username, user.email, hashedPassword, user.role, user.has_access, domain.id]);

      // Define o usuário recém-criado como admin do domínio
      const newUser = await query('SELECT id FROM users WHERE email = $1', [user.email]);
      await Domain.setAdmin(domain.id, newUser[0].id);

      const accessStatus = user.has_access ? 'com acesso' : 'sem acesso';
      console.log(` Usuário criado: ${user.email} (${user.role} - ${accessStatus}, domínio: ${user.domain.code})`);
      created++;
    }

    console.log(`\n Seed concluído! ${created} usuário(s) criado(s).\n`);

    // Lista todos os usuários
    const allUsers = await query('SELECT id, username, email, role, has_access, domain_id FROM users');
    console.log(' Usuários no banco:');
    console.table(allUsers);

    process.exit(0);
  } catch (error) {
    console.error(' Erro no seed:', error);
    process.exit(1);
  }
}

seed();
