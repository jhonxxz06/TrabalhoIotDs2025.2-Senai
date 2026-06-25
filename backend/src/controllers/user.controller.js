const User = require('../models/User');
const Domain = require('../models/Domain');
const Device = require('../models/Device');
const AccessRequest = require('../models/AccessRequest');

const userController = {
  /**
   * GET /api/users
   * Lista os usuários do mesmo domínio do admin autenticado
   */
  async getAll(req, res) {
    try {
      const callingUser = await User.findById(req.user.id);
      const users = callingUser?.domain_id
        ? await User.findByDomainId(callingUser.domain_id)
        : [];

      return res.status(200).json({
        success: true,
        data: {
          users: users.map(u => ({
            ...u,
            hasAccess: Boolean(u.has_access)
          }))
        }
      });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  /**
   * PUT /api/users/:id/access
   * Atualiza o acesso do usuário (admin only)
   */
  async updateAccess(req, res) {
    try {
      const { id } = req.params;
      const { hasAccess } = req.body;

      // Verifica se o usuário existe
      const user = await User.findById(parseInt(id));
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      // Não permite alterar o próprio acesso
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'Não é possível alterar seu próprio acesso'
        });
      }

      // Garante que o usuário-alvo pertence ao mesmo domínio do admin autenticado
      const dbAdmin = await User.findById(req.user.id);
      if (!dbAdmin?.domain_id || user.domain_id !== dbAdmin.domain_id) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado a este usuário'
        });
      }

      // Atualiza o acesso
      const updatedUser = await User.updateAccess(parseInt(id), hasAccess);

      return res.status(200).json({
        success: true,
        message: hasAccess ? 'Acesso concedido' : 'Acesso revogado',
        data: {
          user: User.toPublic(updatedUser)
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar acesso:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  /**
   * PUT /api/users/:id/role
   * Promove ou rebaixa um usuário do mesmo domínio (admin only)
   */
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const targetId = parseInt(id);

      if (targetId === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'Não é possível alterar seu próprio papel'
        });
      }

      const callingUser = await User.findById(req.user.id);
      const domainId = callingUser?.domain_id;

      const target = await User.findById(targetId);
      if (!target || target.domain_id !== domainId) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      if (role === 'user' && target.role === 'admin') {
        const admins = await Domain.getAdmins(domainId);
        if (admins.length <= 1) {
          return res.status(400).json({
            success: false,
            error: 'O domínio precisa de pelo menos um administrador'
          });
        }

        const domain = await Domain.findById(domainId);
        if (domain && domain.admin_id === targetId) {
          const nextAdmin = admins.find(a => a.id !== targetId);
          if (nextAdmin) {
            await Domain.setAdmin(domainId, nextAdmin.id);
          }
        }

        await User.update(targetId, { role: 'user' });
      } else if (role === 'admin' && target.role !== 'admin') {
        await User.update(targetId, { role: 'admin', has_access: 1 });
      }

      const updatedUser = await User.findById(targetId);
      return res.status(200).json({
        success: true,
        message: role === 'admin' ? 'Usuário promovido a administrador' : 'Usuário rebaixado para usuário comum',
        data: { user: User.toPublic(updatedUser) }
      });
    } catch (error) {
      console.error('Erro ao atualizar papel do usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  /**
   * PUT /api/users/:id/remove-from-domain
   * Remove um usuário do domínio do administrador autenticado (admin only)
   */
  async removeFromDomain(req, res) {
    try {
      const { id } = req.params;
      const targetId = parseInt(id);

      if (targetId === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'Não é possível remover a si mesmo do domínio'
        });
      }

      const callingUser = await User.findById(req.user.id);
      const domainId = callingUser?.domain_id;

      const target = await User.findById(targetId);
      if (!target || target.domain_id !== domainId) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      if (target.role === 'admin') {
        const admins = await Domain.getAdmins(domainId);
        if (admins.length <= 1) {
          return res.status(400).json({
            success: false,
            error: 'Não é possível remover o único administrador do domínio'
          });
        }

        const domain = await Domain.findById(domainId);
        if (domain && domain.admin_id === targetId) {
          const nextAdmin = admins.find(a => a.id !== targetId);
          if (nextAdmin) {
            await Domain.setAdmin(domainId, nextAdmin.id);
          }
        }
      }

      await User.update(targetId, { domain_id: null, role: 'user', has_access: 0 });
      await Device.removeAllUserAccess(targetId);
      await AccessRequest.deleteByUserId(targetId);

      return res.status(200).json({
        success: true,
        message: 'Usuário removido do domínio com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover usuário do domínio:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
};

module.exports = userController;
