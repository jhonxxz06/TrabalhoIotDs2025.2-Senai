const { run, query, queryOne } = require('../config/database');

const User = {
  /**
   * Busca usuário por email
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    return await queryOne('SELECT * FROM users WHERE email = $1', [email]);
  },

  /**
   * Busca usuário por ID
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return await queryOne('SELECT * FROM users WHERE id = $1', [id]);
  },

  /**
   * Cria um novo usuário
   * @param {Object} userData - { username, email, password, role?, has_access? }
   * @returns {Promise<Object>} Usuário criado
   */
  async create(userData) {
    const { username, email, password, role = 'user', has_access = 0 } = userData;
    
    await run(`
      INSERT INTO users (username, email, password, role, has_access)
      VALUES ($1, $2, $3, $4, $5)
    `, [username, email, password, role, has_access]);

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
   * Atualiza o acesso do usuário
   * @param {number} id 
   * @param {boolean} hasAccess 
   * @returns {Promise<Object|null>}
   */
  async updateAccess(id, hasAccess) {
    await run('UPDATE users SET has_access = $1 WHERE id = $2', [hasAccess ? 1 : 0, id]);
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
      values.push(data.has_access ? 1 : 0);
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
    const { password, ...publicData } = user;
    return {
      ...publicData,
      hasAccess: Boolean(publicData.has_access)
    };
  }
};

module.exports = User;
