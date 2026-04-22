const { run, query, queryOne } = require('../config/database');

const Domain = {
  /**
   * Cria um novo domínio
   * @param {string} name  - Nome do domínio
   * @param {string} code  - Código único do domínio
   * @param {number} adminId - ID do usuário que será admin
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
   * Remove um domínio
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await run('DELETE FROM domains WHERE id = $1', [id]);
    return true;
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
      createdAt: domain.created_at
    };
  }
};

module.exports = Domain;
