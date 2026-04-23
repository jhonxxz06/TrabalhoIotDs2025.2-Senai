const Domain = require('../models/Domain');

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
   * Rota PRIVADA (admin) — lista todos os domínios
   */
  async getAll(req, res) {
    try {
      const domains = await Domain.findAll();
      return res.status(200).json({
        success: true,
        data: domains.map(Domain.toPublic)
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
   * Rota PRIVADA — lista devices de um domínio
   */
  async getDevices(req, res) {
    try {
      const { id } = req.params;
      const domain = await Domain.findById(id);

      if (!domain) {
        return res.status(404).json({ success: false, error: 'Domínio não encontrado' });
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
   * Rota PRIVADA (admin) — lista usuários pertencentes a um domínio específico.
   * Usado para popular a seção "Usuários com Acesso" no modal de edição de dispositivo.
   */
  async getUsers(req, res) {
    try {
      const { id } = req.params;
      const domain = await Domain.findById(id);

      if (!domain) {
        return res.status(404).json({ success: false, error: 'Domínio não encontrado' });
      }

      const users = await Domain.getUsers(domain.id);
      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      console.error('Erro ao buscar usuários do domínio:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }
};

module.exports = domainController;
