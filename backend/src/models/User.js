const { run, query, queryOne } = require('../config/database');

const User = {
  /**
   * Busca usuário por email
   * @param {string} email 
   * @returns {Object|null}
   */
  findByEmail(email) {
    return queryOne('SELECT * FROM users WHERE email = ?', [email]);
  },

  /**
   * Busca usuário por ID
   * @param {number} id 
   * @returns {Object|null}
   */
  findById(id) {
    return queryOne('SELECT * FROM users WHERE id = ?', [id]);
  },

  /**
   * Cria um novo usuário
   * @param {Object} userData - { username, email, password, role?, has_access? }
   * @returns {Object} Usuário criado
   */
  create(userData) {
    const { username, email, password, role = 'user', has_access = 0 } = userData;
    
    run(`
      INSERT INTO users (username, email, password, role, has_access)
      VALUES (?, ?, ?, ?, ?)
    `, [username, email, password, role, has_access]);

    // Busca pelo email pois lastInsertRowId não funciona bem com sql.js
    return this.findByEmail(email);
  },

  /**
   * Lista todos os usuários (sem senha)
   * @returns {Array}
   */
  findAll() {
    return query(`
      SELECT id, username, email, role, has_access, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
  },

  /**
   * Atualiza o acesso do usuário
   * @param {number} id 
   * @param {boolean} hasAccess 
   * @returns {Object|null}
   */
  updateAccess(id, hasAccess) {
    run('UPDATE users SET has_access = ? WHERE id = ?', [hasAccess ? 1 : 0, id]);
    return this.findById(id);
  },

  /**
   * Atualiza dados do usuário
   * @param {number} id 
   * @param {Object} data 
   * @returns {Object|null}
   */
  update(id, data) {
    const fields = [];
    const values = [];

    if (data.username !== undefined) {
      fields.push('username = ?');
      values.push(data.username);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.password !== undefined) {
      fields.push('password = ?');
      values.push(data.password);
    }
    if (data.role !== undefined) {
      fields.push('role = ?');
      values.push(data.role);
    }
    if (data.has_access !== undefined) {
      fields.push('has_access = ?');
      values.push(data.has_access ? 1 : 0);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    
    return this.findById(id);
  },

  /**
   * Remove um usuário
   * @param {number} id 
   * @returns {boolean}
   */
  delete(id) {
    run('DELETE FROM users WHERE id = ?', [id]);
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
