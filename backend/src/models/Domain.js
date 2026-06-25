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
  async create(name, code, adminId, maxUsers = 10) {
    await run(
      `INSERT INTO domains (name, code, admin_id, max_users) VALUES ($1, $2, $3, $4)`,
      [name, code, adminId, maxUsers]
    );
    return await this.findByCode(code);
  },

  /**
   * Busca domínio pelo código único
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  async findByCode(code) {
    return await queryOne('SELECT * FROM domains WHERE code = $1', [code]);
  },

  /**
   * Busca domínio pelo ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return await queryOne('SELECT * FROM domains WHERE id = $1', [id]);
  },

  /**
   * Lista todos os domínios
   * @returns {Promise<Array>}
   */
  async findAll() {
    return await query('SELECT * FROM domains ORDER BY created_at DESC');
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
    await run(
      'UPDATE domains SET telegram_chat_id = $1, telegram_enabled = $2 WHERE id = $3',
      [chatId, enabled, id]
    );
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
      'UPDATE domains SET telegram_verification_code = $1, telegram_verification_expires_at = $2 WHERE id = $3',
      [code, expiresAt, domainId]
    );
  },

  /**
   * Busca domínio pelo código de verificação Telegram, se não expirado
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  async findByVerificationCode(code) {
    return await queryOne(
      `SELECT id, name, telegram_chat_id
       FROM domains
       WHERE telegram_verification_code = $1
         AND telegram_verification_expires_at > NOW()`,
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
      `UPDATE domains
       SET telegram_chat_id = $1,
           telegram_enabled = true,
           telegram_chat_name = $2,
           telegram_verification_code = NULL,
           telegram_verification_expires_at = NULL
       WHERE id = $3`,
      [chatId, chatName, domainId]
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
      `UPDATE domains
       SET telegram_chat_id = NULL,
           telegram_enabled = false,
           telegram_chat_name = NULL
       WHERE telegram_chat_id = $1
       RETURNING id, name`,
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
    const { PLAN_LIMITS } = require('../constants/plans');
    const limits = PLAN_LIMITS[plan];
    if (!limits) throw new Error(`Plano inválido: ${plan}`);
    await run(
      'UPDATE domains SET plan = $1, max_users = $2, max_devices = $3 WHERE id = $4',
      [plan, limits.maxUsers, limits.maxDevices, domainId]
    );
    return await this.findById(domainId);
  },

  /**
   * Exclui um domínio e todos os dados relacionados em cascata.
   * Ordem: desvincula usuários → deleta devices (cascata: widgets, mqtt_data,
   * device_users, exceedance_counters) → deleta o domínio (FK seta users.domain_id = NULL).
   * @param {number} domainId
   */
  async deleteCascade(domainId) {
    // 1. Rebaixar usuários do domínio antes de perder o vínculo
    await run(
      `UPDATE users SET has_access = 0, role = 'user' WHERE domain_id = $1`,
      [domainId]
    );
    // 2. Deletar devices → cascata limpa widgets, mqtt_data, device_users, exceedance_counters
    await run('DELETE FROM devices WHERE domain_id = $1', [domainId]);
    // 3. Deletar o domínio → FK ON DELETE SET NULL cuida de users.domain_id
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
      maxUsers: domain.max_users,
      maxDevices: domain.max_devices ?? 3,
      plan: domain.plan ?? 'gratuito',
      createdAt: domain.created_at
    };
  }
};

module.exports = Domain;
