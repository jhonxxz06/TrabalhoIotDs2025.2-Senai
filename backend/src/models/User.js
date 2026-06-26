const { run, query, queryOne } = require('../config/database');

const User = {
  /**
   * Busca usuário por email
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    return await queryOne(
      `SELECT u.*, d.name AS domain_name
       FROM users u
       LEFT JOIN domains d ON d.id = u.domain_id
       WHERE u.email = $1`,
      [email]
    );
  },

  /**
   * Busca usuário por ID
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return await queryOne(
      `SELECT u.*, d.name AS domain_name
       FROM users u
       LEFT JOIN domains d ON d.id = u.domain_id
       WHERE u.id = $1`,
      [id]
    );
  },

  /**
   * Cria um novo usuário
   * @param {Object} userData - { username, email, password, role?, has_access?, domain_id? }
   * @returns {Promise<Object>} Usuário criado
   */
  async create(userData) {
    const { username, email, password, role = 'user', has_access = false, domain_id = null } = userData;
    
    await run(`
      INSERT INTO users (username, email, password, role, has_access, domain_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [username, email, password, role, has_access, domain_id]);

    return await this.findByEmail(email);
  },

  /**
   * Lista todos os usuários (sem senha)
   * @returns {Promise<Array>}
   */
  async findAll() {
    return await query(`
      SELECT id, username, email, role, has_access, created_at
      FROM users
      ORDER BY created_at DESC
    `);
  },

  /**
   * Lista usuários de um domínio específico (sem senha)
   * @param {number} domainId
   * @returns {Promise<Array>}
   */
  async findByDomainId(domainId) {
    return await query(`
      SELECT id, username, email, role, has_access, created_at
      FROM users
      WHERE domain_id = $1
      ORDER BY created_at DESC
    `, [domainId]);
  },

  /**
   * Atualiza o acesso do usuário
   * @param {number} id 
   * @param {boolean} hasAccess 
   * @returns {Promise<Object|null>}
   */
  async updateAccess(id, hasAccess) {
    await run('UPDATE users SET has_access = $1 WHERE id = $2', [hasAccess, id]);
    return await this.findById(id);
  },

  /**
   * Atualiza dados do usuário
   * @param {number} id 
   * @param {Object} data 
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.username !== undefined) {
      fields.push(`username = $${fields.length + 1}`);
      values.push(data.username);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${fields.length + 1}`);
      values.push(data.email);
    }
    if (data.password !== undefined) {
      fields.push(`password = $${fields.length + 1}`);
      values.push(data.password);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${fields.length + 1}`);
      values.push(data.role);
    }
    if (data.has_access !== undefined) {
      fields.push(`has_access = $${fields.length + 1}`);
      values.push(Boolean(data.has_access));
    }
    if (data.domain_id !== undefined) {
      fields.push(`domain_id = $${fields.length + 1}`);
      values.push(data.domain_id);
    }

    if (fields.length === 0) return await this.findById(id);

    values.push(id);
    await run(`UPDATE users SET ${fields.join(', ')} WHERE id = $${fields.length + 1}`, values);
    
    return await this.findById(id);
  },

  /**
   * Remove um usuário
   * @param {number} id 
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await run('DELETE FROM users WHERE id = $1', [id]);
    return true;
  },

  /**
   * Retorna dados públicos do usuário (sem senha)
   * @param {Object} user 
   * @returns {Object}
   */
  toPublic(user) {
    if (!user) return null;
    const { password, domain_name, ...publicData } = user;
    return {
      ...publicData,
      hasAccess: Boolean(publicData.has_access),
      domainId: publicData.domain_id ?? null,
      domainName: domain_name ?? null
    };
  }
};

module.exports = User;
