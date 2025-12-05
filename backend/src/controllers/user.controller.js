const User = require('../models/User');

const userController = {
  /**
   * GET /api/users
   * Lista todos os usuários (admin only)
   */
  async getAll(req, res) {
    try {
      const users = User.findAll();
      
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
      const user = User.findById(parseInt(id));
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

      // Atualiza o acesso
      const updatedUser = User.updateAccess(parseInt(id), hasAccess);

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
  }
};

module.exports = userController;
