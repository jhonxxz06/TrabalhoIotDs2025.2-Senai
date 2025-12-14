// ============================================
// AUTH CONTROLLER (Supabase Auth)
// ============================================
const { supabase } = require('../config/supabase');
const Profile = require('../models/Profile');
const AccessRequest = require('../models/AccessRequest');

const authController = {
  /**
   * POST /api/auth/register
   * Cadastra um novo usuário via Supabase Auth
   */
  async register(req, res) {
    try {
      let { username, email, password, requestedDevices } = req.body;

      // 🔎 LOGS DE DEBUG
      console.log('=== DEBUG REGISTER ===');
      console.log('EMAIL RAW:', email, 'typeof:', typeof email);
      console.log('USERNAME RAW:', username, 'typeof:', typeof username);
      console.log('PASSWORD RAW:', password, 'typeof:', typeof password);
      console.log('BODY COMPLETO:', JSON.stringify(req.body));

      // Validação explícita
      if (typeof email !== 'string' || !email) {
        return res.status(400).json({
          success: false,
          error: 'Email inválido (não é string válida)'
        });
      }

      if (typeof password !== 'string' || !password) {
        return res.status(400).json({
          success: false,
          error: 'Senha inválida'
        });
      }

      // Sanitização
      email = email.trim().toLowerCase();
      username = username?.trim() || 'Usuário';
      
      console.log('EMAIL APÓS TRIM:', email);
      console.log('USERNAME APÓS TRIM:', username);
      console.log('===================');

      // Registra usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            role: 'user',
            has_access: false
          }
        }
      });

      if (authError) {
        console.error('❌ SUPABASE AUTH ERROR:', authError);
        if (authError.message.includes('already registered')) {
          return res.status(400).json({
            success: false,
            error: 'E-mail já cadastrado'
          });
        }
        throw authError;
      }

      const userId = authData.user.id;

      // Aguardar trigger criar profile (pequeno delay)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Buscar profile criado
      const profile = await Profile.findById(userId);

      // Cria solicitações de acesso para os dispositivos selecionados
      if (requestedDevices && requestedDevices.length > 0) {
        for (const deviceId of requestedDevices) {
          try {
            await AccessRequest.create(
              userId,
              deviceId,
              'Solicitação de acesso durante cadastro'
            );
            console.log(`Solicitação criada para dispositivo ${deviceId}`);
          } catch (err) {
            console.error(`Erro ao criar solicitação para dispositivo ${deviceId}:`, err);
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso. Aguarde aprovação do administrador.',
        data: {
          user: Profile.toPublic(profile)
        }
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  /**
   * POST /api/auth/login
   * Autentica o usuário via Supabase Auth
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Login via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        return res.status(401).json({
          success: false,
          error: 'E-mail ou senha inválidos'
        });
      }

      // Busca profile do usuário
      const profile = await Profile.findById(authData.user.id);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Perfil do usuário não encontrado'
        });
      }

      // Token JWT do Supabase
      const token = authData.session.access_token;

      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          user: Profile.toPublic(profile)
        }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  /**
   * GET /api/auth/me
   * Retorna os dados do usuário logado
   */
  async me(req, res) {
    try {
      // req.user é injetado pelo middleware de autenticação
      const profile = await Profile.findById(req.user.id);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: Profile.toPublic(profile)
        }
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
};

module.exports = authController;
