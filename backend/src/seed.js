require('dotenv').config();
const supabase = require('./config/supabase');
const Profile = require('./models/Profile');

const users = [
  {
    username: 'Administrador',
    email: 'admin@teste.com',
    password: 'admin123',
    role: 'admin',
    has_access: true
  }
];

async function seed() {
  try {
    console.log('\n🌱 Iniciando seed de usuários no Supabase...\n');
    
    let created = 0;
    
    for (const user of users) {
      // Verifica se o usuário já existe
      const existing = await Profile.findByEmail(user.email);
      
      if (existing) {
        console.log(`⚠️  Usuário já existe: ${user.email}`);
        continue;
      }
      
      // Cria usuário com Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            username: user.username,
            role: user.role,
            has_access: user.has_access
          }
        }
      });

      if (error) {
        console.error(`❌ Erro ao criar ${user.email}:`, error.message);
        continue;
      }

      // Aguarda trigger criar profile
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const accessStatus = user.has_access ? 'com acesso' : 'sem acesso';
      console.log(`✅ Usuário criado: ${user.email} (${user.role} - ${accessStatus})`);
      created++;
    }
    
    console.log(`\n🎉 Seed concluído! ${created} usuário(s) criado(s).\n`);
    
    // Lista todos os usuários
    const allUsers = await Profile.findAll();
    console.log('📋 Usuários no banco:');
    console.table(allUsers.map(u => Profile.toPublic(u)));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  }
}

seed();
