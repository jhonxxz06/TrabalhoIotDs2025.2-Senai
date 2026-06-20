const Domain = require('../models/Domain');
const User = require('../models/User');

const domainController = {
  /**
   * GET /api/domains/verify/:code
   * Rota PÚBLICA — verifica se um código de domínio existe.
   * Retorna o nome do domínio e seus dispositivos para popular o seletor no cadastro.
   */
  async verify(req, res) {
    try {
      const { code } = req.params;

      if (!code || code.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Código de domínio não informado'
        });
      }

      const domain = await Domain.findByCode(code.trim());

      if (!domain) {
        return res.status(404).json({
          success: false,
          error: 'Domínio não encontrado. Verifique o código informado.'
        });
      }

      // Retorna os dispositivos do domínio para o seletor no frontend
      const devices = await Domain.getDevices(domain.id);

      return res.status(200).json({
        success: true,
        data: {
          domain: Domain.toPublic(domain),
          devices
        }
      });
    } catch (error) {
      console.error('Erro ao verificar domínio:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  /**
   * GET /api/domains
   * Rota PRIVADA — retorna apenas o domínio ao qual o usuário autenticado pertence
   */
  async getAll(req, res) {
    try {
      const callingUser = await User.findById(req.user.id);

      if (!callingUser?.domain_id) {
        return res.status(200).json({ success: true, data: [] });
      }

      const domain = await Domain.findById(callingUser.domain_id);
      return res.status(200).json({
        success: true,
        data: domain ? [Domain.toPublic(domain)] : []
      });
    } catch (error) {
      console.error('Erro ao listar domínios:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  /**
   * GET /api/domains/:id/devices
   * Rota PRIVADA — lista devices de um domínio (apenas o próprio domínio do usuário)
   */
  async getDevices(req, res) {
    try {
      const { id } = req.params;
      const domain = await Domain.findById(id);

      if (!domain) {
        return res.status(404).json({ success: false, error: 'Domínio não encontrado' });
      }

      const callingUser = await User.findById(req.user.id);
      if (callingUser?.domain_id !== domain.id) {
        return res.status(403).json({ success: false, error: 'Acesso negado a este domínio' });
      }

      const devices = await Domain.getDevices(domain.id);
      return res.status(200).json({ success: true, data: devices });
    } catch (error) {
      console.error('Erro ao buscar devices do domínio:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  },

  /**
   * GET /api/domains/:id/users
   * Rota PRIVADA — lista usuários pertencentes a um domínio (apenas o próprio domínio do usuário).
   * Usado para popular a seção "Usuários com Acesso" no modal de edição de dispositivo.
   */
  async getUsers(req, res) {
    try {
      const { id } = req.params;
      const domain = await Domain.findById(id);

      if (!domain) {
        return res.status(404).json({ success: false, error: 'Domínio não encontrado' });
      }

      const callingUser = await User.findById(req.user.id);
      if (callingUser?.domain_id !== domain.id) {
        return res.status(403).json({ success: false, error: 'Acesso negado a este domínio' });
      }

      const users = await Domain.getUsers(domain.id);
      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      console.error('Erro ao buscar usuários do domínio:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  },

  /**
   * GET /api/domains/:id/telegram
   * Rota PRIVADA (admin) — retorna a configuração de notificações via Telegram do domínio
   */
  async getTelegramConfig(req, res) {
    try {
      const { id } = req.params;
      const domain = await Domain.findById(id);

      if (!domain) {
        return res.status(404).json({ success: false, message: 'Domínio não encontrado' });
      }

      const callingUser = await User.findById(req.user.id);
      if (callingUser?.domain_id !== domain.id) {
        return res.status(403).json({ success: false, message: 'Acesso negado a este domínio' });
      }

      return res.status(200).json({
        success: true,
        data: {
          chatId: domain.telegram_chat_id ?? null,
          enabled: domain.telegram_enabled ?? false
        }
      });
    } catch (error) {
      console.error('Erro ao buscar configuração do Telegram:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  /**
   * PUT /api/domains/:id/telegram
   * Rota PRIVADA (admin) — atualiza a configuração de notificações via Telegram do domínio
   */
  async updateTelegramConfig(req, res) {
    try {
      const { id } = req.params;
      const domain = await Domain.findById(id);

      if (!domain) {
        return res.status(404).json({ success: false, message: 'Domínio não encontrado' });
      }

      const callingUser = await User.findById(req.user.id);
      if (callingUser?.domain_id !== domain.id) {
        return res.status(403).json({ success: false, message: 'Acesso negado a este domínio' });
      }

      const { chatId, enabled } = req.body;
      await Domain.updateTelegramConfig(domain.id, { chatId, enabled });

      return res.status(200).json({
        success: true,
        message: 'Configuração do Telegram atualizada'
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração do Telegram:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }
};

module.exports = domainController;
