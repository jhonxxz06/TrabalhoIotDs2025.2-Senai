const { run, query, queryOne } = require('../config/database');

const Domain = {
  /**
   * Cria um novo domínio
   * @param {string} name  - Nome do domínio
   * @param {string} code  - Código único do domínio
   * @param {number} adminId - ID do usuário que será admin
   * @param {number} maxUsers - Limite de usuários do domínio
   * @returns {Promise<Object>} Domínio criado
   */
  async create(name, code, adminId) {
    await run(
      `INSERT INTO domains (name, code, admin_id) VALUES ($1, $2, $3)`,
      [name, code, adminId]
    );
    return await this.findByCode(code);
  },

  /**
   * Busca domínio pelo código único
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  async findByCode(code) {
    return await queryOne(
      `SELECT d.*,
         p.max_users, p.max_devices,
         tc.chat_id              AS telegram_chat_id,
         tc.chat_name            AS telegram_chat_name,
         tc.enabled              AS telegram_enabled,
         tc.verification_code    AS telegram_verification_code,
         tc.verification_expires_at AS telegram_verification_expires_at
       FROM domains d
       LEFT JOIN plans p ON p.name = d.plan
       LEFT JOIN domain_telegram_configs tc ON tc.domain_id = d.id
       WHERE d.code = $1`,
      [code]
    );
  },

  /**
   * Busca domínio pelo ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return await queryOne(
      `SELECT d.*,
         p.max_users, p.max_devices,
         tc.chat_id              AS telegram_chat_id,
         tc.chat_name            AS telegram_chat_name,
         tc.enabled              AS telegram_enabled,
         tc.verification_code    AS telegram_verification_code,
         tc.verification_expires_at AS telegram_verification_expires_at
       FROM domains d
       LEFT JOIN plans p ON p.name = d.plan
       LEFT JOIN domain_telegram_configs tc ON tc.domain_id = d.id
       WHERE d.id = $1`,
      [id]
    );
  },

  /**
   * Lista todos os domínios
   * @returns {Promise<Array>}
   */
  async findAll() {
    return await query(
      `SELECT d.*,
         p.max_users, p.max_devices,
         tc.chat_id              AS telegram_chat_id,
         tc.chat_name            AS telegram_chat_name,
         tc.enabled              AS telegram_enabled,
         tc.verification_code    AS telegram_verification_code,
         tc.verification_expires_at AS telegram_verification_expires_at
       FROM domains d
       LEFT JOIN plans p ON p.name = d.plan
       LEFT JOIN domain_telegram_configs tc ON tc.domain_id = d.id
       ORDER BY d.created_at DESC`
    );
  },

  /**
   * Lista os dispositivos pertencentes a um domínio
   * @param {number} domainId
   * @returns {Promise<Array>}
   */
  async getDevices(domainId) {
    return await query(
      `SELECT id, name, mqtt_broker, mqtt_port, mqtt_topic, created_at
       FROM devices
       WHERE domain_id = $1
       ORDER BY created_at DESC`,
      [domainId]
    );
  },

  /**
   * Lista os usuários pertencentes a um domínio
   * @param {number} domainId
   * @returns {Promise<Array>}
   */
  async getUsers(domainId) {
    return await query(
      `SELECT id, username, email, role, has_access, created_at
       FROM users
       WHERE domain_id = $1
       ORDER BY created_at DESC`,
      [domainId]
    );
  },

  /**
   * Atualiza o admin_id de um domínio (após criar o usuário)
   * @param {number} domainId
   * @param {number} adminId
   * @returns {Promise<Object|null>}
   */
  async setAdmin(domainId, adminId) {
    await run('UPDATE domains SET admin_id = $1 WHERE id = $2', [adminId, domainId]);
    return await this.findById(domainId);
  },

  /**
   * Conta quantos usuários pertencem a um domínio
   * @param {number} domainId
   * @returns {Promise<number>}
   */
  async countUsers(domainId) {
    const result = await queryOne(
      'SELECT COUNT(*)::int AS count FROM users WHERE domain_id = $1',
      [domainId]
    );
    return result ? result.count : 0;
  },

  /**
   * Lista os administradores de um domínio
   * @param {number} domainId
   * @returns {Promise<Array>}
   */
  async getAdmins(domainId) {
    return await query(
      `SELECT id, username, email FROM users WHERE domain_id = $1 AND role = 'admin'`,
      [domainId]
    );
  },

  /**
   * Remove um domínio
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await run('DELETE FROM domains WHERE id = $1', [id]);
    return true;
  },

  /**
   * Atualiza a configuração de notificações via Telegram do domínio
   * @param {number} id
   * @param {{chatId: string|null, enabled: boolean}} data
   * @returns {Promise<Object|null>}
   */
  async updateTelegramConfig(id, { chatId, enabled }) {
    if (chatId) {
      await run(
        `INSERT INTO domain_telegram_configs (domain_id, chat_id, enabled)
         VALUES ($1, $2, $3)
         ON CONFLICT (domain_id) DO UPDATE
           SET chat_id = EXCLUDED.chat_id, enabled = EXCLUDED.enabled`,
        [id, chatId, enabled]
      );
    } else {
      await run('DELETE FROM domain_telegram_configs WHERE domain_id = $1', [id]);
    }
    return await this.findById(id);
  },

  /**
   * Salva (ou substitui) o código de verificação Telegram de um domínio
   * @param {number} domainId
   * @param {string} code
   * @param {Date} expiresAt
   */
  async saveVerificationCode(domainId, code, expiresAt) {
    await run(
      `INSERT INTO domain_telegram_configs
         (domain_id, chat_id, enabled, verification_code, verification_expires_at)
       VALUES ($1, NULL, false, $2, $3)
       ON CONFLICT (domain_id) DO UPDATE
         SET verification_code = $2, verification_expires_at = $3`,
      [domainId, code, expiresAt]
    );
  },

  /**
   * Busca domínio pelo código de verificação Telegram, se não expirado
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  async findByVerificationCode(code) {
    return await queryOne(
      `SELECT d.id, d.name, tc.chat_id AS telegram_chat_id
       FROM domains d
       JOIN domain_telegram_configs tc ON tc.domain_id = d.id
       WHERE tc.verification_code = $1
         AND tc.verification_expires_at > NOW()`,
      [code]
    );
  },

  /**
   * Vincula o chat_id ao domínio e limpa o código de verificação
   * @param {number} domainId
   * @param {string} chatId
   * @param {string} chatName
   */
  async completeTelegramConnection(domainId, chatId, chatName) {
    await run(
      `INSERT INTO domain_telegram_configs
         (domain_id, chat_id, chat_name, enabled, verification_code, verification_expires_at)
       VALUES ($1, $2, $3, true, NULL, NULL)
       ON CONFLICT (domain_id) DO UPDATE
         SET chat_id = EXCLUDED.chat_id,
             chat_name = EXCLUDED.chat_name,
             enabled = true,
             verification_code = NULL,
             verification_expires_at = NULL`,
      [domainId, chatId, chatName]
    );
  },

  /**
   * Remove a vinculação Telegram de um domínio identificado pelo chat_id
   * (o bot não conhece o domain_id, apenas o chat de onde o comando veio)
   * @param {string} chatId
   * @returns {Promise<Object|null>} domínio desvinculado ou null
   */
  async disconnectTelegram(chatId) {
    const result = await run(
      `WITH deleted AS (
         DELETE FROM domain_telegram_configs WHERE chat_id = $1 RETURNING domain_id
       )
       SELECT d.id, d.name FROM domains d JOIN deleted ON d.id = deleted.domain_id`,
      [chatId]
    );
    return result.rows[0] ?? null;
  },

  /**
   * Conta quantos dispositivos pertencem a um domínio
   * @param {number} domainId
   * @returns {Promise<number>}
   */
  async countDevices(domainId) {
    const result = await queryOne(
      'SELECT COUNT(*)::int AS count FROM devices WHERE domain_id = $1',
      [domainId]
    );
    return result ? result.count : 0;
  },

  /**
   * Atualiza o plano do domínio, ajustando max_users e max_devices conforme o novo plano
   * @param {number} domainId
   * @param {string} plan
   * @returns {Promise<Object|null>}
   */
  async updatePlan(domainId, plan) {
    const exists = await queryOne('SELECT name FROM plans WHERE name = $1', [plan]);
    if (!exists) throw new Error(`Plano inválido: ${plan}`);
    await run('UPDATE domains SET plan = $1 WHERE id = $2', [plan, domainId]);
    return await this.findById(domainId);
  },

  /**
   * Exclui um domínio e todos os dados relacionados em cascata.
   * Ordem: desvincula usuários → deleta devices (cascata: widgets, mqtt_data,
   * device_users, exceedance_counters) → deleta o domínio (FK seta users.domain_id = NULL).
   * @param {number} domainId
   */
  async deleteCascade(domainId) {
    // 1. Desvincular usuários: zera domain_id, rebaixa role e revoga acesso
    await run(
      `UPDATE users SET domain_id = NULL, has_access = false, role = 'user' WHERE domain_id = $1`,
      [domainId]
    );
    // 2. Deletar devices → cascata limpa widgets, mqtt_data, device_users, exceedance_counters
    await run('DELETE FROM devices WHERE domain_id = $1', [domainId]);
    // 3. Deletar o domínio
    await run('DELETE FROM domains WHERE id = $1', [domainId]);
  },

  /**
   * Atualiza o nome e o código de um domínio
   * @param {number} domainId
   * @param {{name: string, code: string}} data
   * @returns {Promise<Object|null>}
   */
  async update(domainId, { name, code }) {
    await run(
      'UPDATE domains SET name = $1, code = $2 WHERE id = $3',
      [name, code, domainId]
    );
    return await this.findById(domainId);
  },

  /**
   * Retorna representação pública do domínio
   * @param {Object} domain
   * @returns {Object}
   */
  toPublic(domain) {
    if (!domain) return null;
    return {
      id: domain.id,
      name: domain.name,
      code: domain.code,
      adminId: domain.admin_id,
      plan: domain.plan ?? 'gratuito',
      maxUsers: domain.max_users ?? 2,
      maxDevices: domain.max_devices ?? 3,
      createdAt: domain.created_at
    };
  }
};

module.exports = Domain;
