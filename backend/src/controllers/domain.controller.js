const crypto = require('crypto');
const Domain = require('../models/Domain');
const User = require('../models/User');
const telegramService = require('../services/telegram.service');

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

      const now = new Date();
      const codeActive =
        domain.telegram_verification_code &&
        domain.telegram_verification_expires_at &&
        new Date(domain.telegram_verification_expires_at) > now;

      return res.status(200).json({
        success: true,
        data: {
          chatId: domain.telegram_chat_id ?? null,
          chatName: domain.telegram_chat_name ?? null,
          enabled: domain.telegram_enabled ?? false,
          verificationCode: codeActive ? domain.telegram_verification_code : null,
          verificationExpiresAt: codeActive ? domain.telegram_verification_expires_at : null
        }
      });
    } catch (error) {
      console.error('Erro ao buscar configuração do Telegram:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  /**
   * POST /api/domains/:id/telegram/generate-code
   * Rota PRIVADA (admin) — gera ou reutiliza código de verificação Telegram (válido 15 min)
   */
  async generateVerificationCode(req, res) {
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

      // Reutilizar código ainda válido em vez de gerar novo
      const now = new Date();
      if (
        domain.telegram_verification_code &&
        domain.telegram_verification_expires_at &&
        new Date(domain.telegram_verification_expires_at) > now
      ) {
        return res.status(200).json({
          success: true,
          data: {
            code: domain.telegram_verification_code,
            expiresAt: domain.telegram_verification_expires_at
          }
        });
      }

      const code = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await Domain.saveVerificationCode(domain.id, code, expiresAt);

      return res.status(200).json({
        success: true,
        data: { code, expiresAt }
      });
    } catch (error) {
      console.error('Erro ao gerar código de verificação Telegram:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  /**
   * POST /api/telegram/webhook
   * Rota PÚBLICA protegida por secret_token — recebe updates do Telegram Bot API.
   * Sempre retorna 200 para updates válidos (evita reenvio pelo Telegram).
   * TODO: confirmar username do bot (@CleanAirBot) antes de colocar em produção
   */
  async handleTelegramWebhook(req, res) {
    // Validar secret enviado pelo Telegram no header
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (!incomingSecret || incomingSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Responder 200 imediatamente — o Telegram reenvia se não receber 200
    res.status(200).json({ ok: true });

    // Processar update de forma assíncrona após o 200
    try {
      const update = req.body;
      const message = update?.message;
      if (!message?.text) return;

      const chatId = String(message.chat.id);
      const chatTitle = message.chat.title || 'Chat privado';
      const text = message.text.trim();

      if (text.startsWith('/conectar')) {
        const parts = text.split(/\s+/);
        const code = parts[1]?.trim().toUpperCase();

        if (!code) {
          await telegramService.sendMessage(chatId, '❌ Código não informado. Use: /conectar CÓDIGO');
          return;
        }

        const domain = await Domain.findByVerificationCode(code);

        if (!domain) {
          await telegramService.sendMessage(chatId, '❌ Código inválido ou expirado. Gere um novo código no painel do Clean Air.');
          return;
        }

        if (domain.telegram_chat_id && domain.telegram_chat_id !== chatId) {
          await telegramService.sendMessage(chatId, '⚠️ Este domínio já está conectado a outro grupo. Desconecte primeiro.');
          return;
        }

        if (domain.telegram_chat_id === chatId) {
          await telegramService.sendMessage(chatId, `ℹ️ Este grupo já está conectado ao domínio <b>${domain.name}</b>.`);
          return;
        }

        await Domain.completeTelegramConnection(domain.id, chatId, chatTitle);
        await telegramService.sendMessage(chatId, `✅ Conectado! As notificações de excedência do domínio <b>${domain.name}</b> serão enviadas neste grupo.`);

      } else if (text.startsWith('/desconectar')) {
        const domain = await Domain.disconnectTelegram(chatId);

        if (!domain) {
          await telegramService.sendMessage(chatId, 'ℹ️ Este grupo não está conectado a nenhum domínio.');
          return;
        }

        await telegramService.sendMessage(chatId, `❌ Grupo desconectado do domínio <b>${domain.name}</b>. As notificações não serão mais enviadas aqui.`);
      }
      // Qualquer outra mensagem é ignorada silenciosamente
    } catch (error) {
      console.error('[Telegram Webhook] Erro ao processar update:', error.message);
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
