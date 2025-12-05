const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AccessRequest = require('../models/AccessRequest');
const { generateToken } = require('../services/token.service');

const authController = {
  /**
   * POST /api/auth/register
   * Cadastra um novo usuário
   */
  async register(req, res) {
    try {
      const { username, email, password, requestedDevices } = req.body;

      // Verifica se o email já existe
      const existingUser = User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'E-mail já cadastrado'
        });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Cria o usuário (has_access = false por padrão)
      const user = User.create({
        username,
        email,
        password: hashedPassword,
        role: 'user',
        has_access: 0
      });

      // Cria solicitações de acesso para os dispositivos selecionados
      if (requestedDevices && requestedDevices.length > 0) {
        for (const deviceId of requestedDevices) {
          try {
            AccessRequest.create(
              user.id,
              deviceId,
              'Solicitação de acesso durante cadastro'
            );
            console.log(`Solicitação criada para dispositivo ${deviceId}`);
          } catch (err) {
            console.error(`Erro ao criar solicitação para dispositivo ${deviceId}:`, err);
          }
        }
      }

      // Gera o token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      return res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso',
        data: {
          token,
          user: User.toPublic(user)
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
   * Autentica o usuário
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Busca o usuário pelo email
      const user = User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'E-mail ou senha inválidos'
        });
      }

      // Verifica a senha
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'E-mail ou senha inválidos'
        });
      }

      // Gera o token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          user: User.toPublic(user)
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
      const user = User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: User.toPublic(user)
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
