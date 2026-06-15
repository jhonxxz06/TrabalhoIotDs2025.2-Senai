const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Domain = require('../models/Domain');
const AccessRequest = require('../models/AccessRequest');
const Device = require('../models/Device');
const { generateToken } = require('../services/token.service');

/**
 * Cria solicitações de acesso para os devices informados, ignorando
 * (e logando) qualquer deviceId que não pertença ao domínio informado.
 */
async function createDeviceAccessRequests(userId, requestedDevices, domainId, message) {
  for (const deviceId of requestedDevices) {
    try {
      const device = await Device.findById(deviceId);
      if (!device || device.domain_id !== domainId) {
        console.error(`Solicitação ignorada: dispositivo ${deviceId} não pertence ao domínio ${domainId}`);
        continue;
      }
      await AccessRequest.create(userId, deviceId, message);
    } catch (err) {
      console.error(`Erro ao criar solicitação para dispositivo ${deviceId}:`, err);
    }
  }
}

/**
 * Monta os dados públicos do usuário, incluindo estatísticas do domínio
 * (contagem de usuários e limite do plano), quando aplicável.
 * @param {Object} user
 * @returns {Promise<Object>}
 */
async function buildPublicUser(user) {
  const publicUser = User.toPublic(user);

  if (user.domain_id) {
    const [domain, count] = await Promise.all([
      Domain.findById(user.domain_id),
      Domain.countUsers(user.domain_id)
    ]);
    publicUser.domainUserCount = count;
    publicUser.domainUserLimit = domain?.max_users ?? null;
  }

  return publicUser;
}

const authController = {
  /**
   * POST /api/auth/register
   * Cadastra um novo usuário.
   *
   * Fluxo Gerente (isManager = true):
   *   - Cria o domínio com domainName + domainCode
   *   - Cria o usuário com role='admin', has_access=1, domain_id=novo domínio
   *   - Define o usuário como admin_id do domínio
   *
   * Fluxo Usuário comum (isManager = false):
   *   - Valida que o domínio com domainCode existe
   *   - Cria o usuário com role='user', has_access=0, domain_id=domínio encontrado
   *   - Cria solicitações de acesso para os dispositivos selecionados
   */
  async register(req, res) {
    try {
      const { username, email, password, isManager, domainName, domainCode, requestedDevices } = req.body;

      // Verifica se o email já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'E-mail já cadastrado' });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      let domainId = null;
      let userRole = 'user';
      let userHasAccess = 0;

      if (isManager) {
        // ── Fluxo Gerente ──────────────────────────────────────────────────
        if (!domainName || !domainCode) {
          return res.status(400).json({
            success: false,
            error: 'Nome e código do domínio são obrigatórios para gerentes'
          });
        }

        // Verifica se o código de domínio já existe
        const existingDomain = await Domain.findByCode(domainCode.trim());
        if (existingDomain) {
          return res.status(400).json({
            success: false,
            error: 'Código de domínio já utilizado. Escolha outro código.'
          });
        }

        // Cria o domínio temporariamente sem admin (será atualizado após criar o usuário)
        const newDomain = await Domain.create(domainName.trim(), domainCode.trim(), null);
        domainId = newDomain.id;
        userRole = 'admin';
        userHasAccess = 1; // Gerente já tem acesso automático

      } else {
        // ── Fluxo Usuário Comum ────────────────────────────────────────────
        if (!domainCode) {
          return res.status(400).json({
            success: false,
            error: 'Código do domínio é obrigatório'
          });
        }

        const domain = await Domain.findByCode(domainCode.trim());
        if (!domain) {
          return res.status(404).json({
            success: false,
            error: 'Domínio não encontrado. Verifique o código informado.'
          });
        }

        domainId = domain.id;
      }

      // Cria o usuário
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role: userRole,
        has_access: userHasAccess,
        domain_id: domainId
      });

      // Se for gerente, atualiza o admin_id do domínio agora que o usuário existe
      if (isManager && domainId) {
        await Domain.setAdmin(domainId, user.id);
      }

      // Cria solicitações de acesso (apenas para usuários comuns)
      if (!isManager) {
        if (requestedDevices && requestedDevices.length > 0) {
          await createDeviceAccessRequests(user.id, requestedDevices, domainId, 'Solicitação de acesso durante cadastro');
        } else {
          try {
            await AccessRequest.create(user.id, null, 'Solicitação de acesso geral durante cadastro');
          } catch (err) {
            console.error('Erro ao criar solicitação geral:', err);
          }
        }
      }

      // Gera o token
      const token = generateToken({ id: user.id, email: user.email, role: user.role });

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
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  },

  /**
   * POST /api/auth/login
   * Autentica o usuário.
   *
   * Usuários vinculados a um domínio (domain_id != null) devem informar
   * domainCode, que precisa corresponder ao seu domain_id. Usuários órfãos
   * (sem domínio) podem logar sem domainCode, para então ingressar ou criar
   * um domínio. O sistema é estritamente multi-tenant: não há usuários com
   * privilégios especiais baseados em e-mail.
   */
  async login(req, res) {
    try {
      const { email, password, domainCode } = req.body;

      // Busca o usuário pelo email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, error: 'E-mail ou senha inválidos' });
      }

      // Verifica a senha
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: 'E-mail ou senha inválidos' });
      }

      // Validação de domínio (obrigatória para usuários vinculados a um domínio)
      if (user.domain_id !== null) {
        if (!domainCode) {
          return res.status(400).json({ success: false, error: 'Código do domínio é obrigatório' });
        }

        const domain = await Domain.findByCode(domainCode.trim());
        if (!domain) {
          return res.status(401).json({ success: false, error: 'Código de domínio inválido' });
        }

        // Verifica se o usuário pertence ao domínio informado
        if (user.domain_id !== domain.id) {
          return res.status(401).json({
            success: false,
            error: 'Você não pertence a este domínio'
          });
        }
      }

      // Gera o token
      const token = generateToken({ id: user.id, email: user.email, role: user.role });

      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          user: await buildPublicUser(user)
        }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  },

  /**
   * GET /api/auth/me
   * Retorna os dados do usuário logado
   */
  async me(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }

      return res.status(200).json({
        success: true,
        data: { user: await buildPublicUser(user) }
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  },

  /**
   * PUT /api/auth/profile
   * Atualiza dados do perfil do usuário logado (username, email, password)
   */
  async updateProfile(req, res) {
    try {
      const { username, email, currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }

      const updateData = {};

      if (username !== undefined && username.trim()) {
        updateData.username = username.trim();
      }
      if (email !== undefined && email.trim()) {
        updateData.email = email.trim();
      }

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, error: 'Senha atual é obrigatória para alterar a senha' });
        }
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
          return res.status(400).json({ success: false, error: 'Senha atual incorreta' });
        }
        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
          return res.status(400).json({ success: false, error: 'A nova senha deve ser diferente da senha atual' });
        }
        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum dado para atualizar' });
      }

      const updatedUser = await User.update(userId, updateData);
      return res.status(200).json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: { user: User.toPublic(updatedUser) }
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  },

  /**
   * DELETE /api/auth/account
   * Exclui a conta do usuário logado
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }
      await User.delete(userId);
      return res.status(200).json({ success: true, message: 'Conta excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  },

  /**
   * PUT /api/auth/leave-domain
   * Remove o usuário do seu domínio atual.
   *
   * - Usuário comum: simplesmente sai (fica órfão).
   * - Admin com outro admin no domínio: sai diretamente, repassando
   *   admin_id se for o caso.
   * - Admin único do domínio: precisa transferir a posse para outro
   *   membro (transferToUserId). Se não for informado e houver outros
   *   membros, retorna `requiresTransfer: true` com a lista de candidatos.
   */
  async leaveDomain(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }
      if (!user.domain_id) {
        return res.status(400).json({ success: false, error: 'Você não pertence a nenhum domínio' });
      }

      const domainId = user.domain_id;

      if (user.role !== 'admin') {
        await User.update(userId, { domain_id: null, role: 'user', has_access: 0 });
        return res.status(200).json({ success: true, message: 'Você saiu do domínio com sucesso' });
      }

      // Usuário é admin: verifica se há outros administradores no domínio
      const admins = await Domain.getAdmins(domainId);
      const otherAdmins = admins.filter(a => a.id !== userId);

      if (otherAdmins.length > 0) {
        const domain = await Domain.findById(domainId);
        if (domain && domain.admin_id === userId) {
          await Domain.setAdmin(domainId, otherAdmins[0].id);
        }
        await User.update(userId, { domain_id: null, role: 'user', has_access: 0 });
        return res.status(200).json({ success: true, message: 'Você saiu do domínio com sucesso' });
      }

      // Não há outros administradores: é necessário transferir a posse
      const domainUsers = await Domain.getUsers(domainId);
      const otherUsers = domainUsers.filter(u => u.id !== userId);

      if (otherUsers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Você é o único membro do domínio. Não é possível sair sem transferir a posse.'
        });
      }

      const { transferToUserId } = req.body;
      if (!transferToUserId) {
        return res.status(200).json({
          success: true,
          requiresTransfer: true,
          candidates: otherUsers
        });
      }

      const target = otherUsers.find(u => u.id === Number(transferToUserId));
      if (!target) {
        return res.status(400).json({ success: false, error: 'Usuário selecionado para transferência inválido' });
      }

      await User.update(target.id, { role: 'admin', has_access: 1 });
      await Domain.setAdmin(domainId, target.id);
      await User.update(userId, { domain_id: null, role: 'user', has_access: 0 });

      return res.status(200).json({
        success: true,
        message: 'Posse transferida e você saiu do domínio com sucesso'
      });
    } catch (error) {
      console.error('Erro ao sair do domínio:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  },

  /**
   * PUT /api/auth/join-domain
   * Usuário sem domínio (órfão) solicita acesso a um domínio existente.
   * O usuário entra como pendente (has_access = 0) e uma solicitação de
   * acesso é criada para aprovação do admin do domínio.
   */
  async joinDomain(req, res) {
    try {
      const userId = req.user.id;
      const { domainCode, requestedDevices } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }
      if (user.domain_id) {
        return res.status(400).json({ success: false, error: 'Você já pertence a um domínio' });
      }

      const domain = await Domain.findByCode(domainCode.trim());
      if (!domain) {
        return res.status(404).json({
          success: false,
          error: 'Domínio não encontrado. Verifique o código informado.'
        });
      }

      await User.update(userId, { domain_id: domain.id, role: 'user', has_access: 0 });

      if (requestedDevices && requestedDevices.length > 0) {
        await createDeviceAccessRequests(userId, requestedDevices, domain.id, 'Solicitação de acesso a domínio');
      } else {
        try {
          await AccessRequest.create(userId, null, 'Solicitação de acesso geral a domínio');
        } catch (err) {
          console.error('Erro ao criar solicitação geral:', err);
        }
      }

      const updatedUser = await User.findById(userId);
      return res.status(200).json({
        success: true,
        message: 'Solicitação de acesso enviada com sucesso',
        data: { user: await buildPublicUser(updatedUser) }
      });
    } catch (error) {
      console.error('Erro ao solicitar acesso ao domínio:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  },

  /**
   * PUT /api/auth/create-domain
   * Usuário sem domínio (órfão) cria seu próprio domínio e se torna admin.
   */
  async createDomain(req, res) {
    try {
      const userId = req.user.id;
      const { domainName, domainCode } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }
      if (user.domain_id) {
        return res.status(400).json({ success: false, error: 'Você já pertence a um domínio' });
      }

      const existingDomain = await Domain.findByCode(domainCode.trim());
      if (existingDomain) {
        return res.status(400).json({
          success: false,
          error: 'Código de domínio já utilizado. Escolha outro código.'
        });
      }

      const newDomain = await Domain.create(domainName.trim(), domainCode.trim(), null);
      await User.update(userId, { domain_id: newDomain.id, role: 'admin', has_access: 1 });
      await Domain.setAdmin(newDomain.id, userId);

      const updatedUser = await User.findById(userId);
      return res.status(200).json({
        success: true,
        message: 'Domínio criado com sucesso',
        data: { user: await buildPublicUser(updatedUser) }
      });
    } catch (error) {
      console.error('Erro ao criar domínio:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }
};

module.exports = authController;
