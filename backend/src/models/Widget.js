const { run, query, queryOne } = require('../config/database');

const Widget = {
  /**
   * Busca widget por ID
   */
  findById(id) {
    return queryOne('SELECT * FROM widgets WHERE id = ?', [id]);
  },

  /**
   * Lista todos os widgets
   */
  findAll() {
    return query('SELECT * FROM widgets ORDER BY created_at DESC');
  },

  /**
   * Lista widgets de um dispositivo
   */
  findByDeviceId(deviceId) {
    return query('SELECT * FROM widgets WHERE device_id = ? ORDER BY created_at DESC', [deviceId]);
  },

  /**
   * Lista widgets acessíveis por um usuário (via dispositivos atribuídos)
   */
  findByUserId(userId) {
    return query(`
      SELECT w.* FROM widgets w
      INNER JOIN devices d ON w.device_id = d.id
      INNER JOIN device_users du ON d.id = du.device_id
      WHERE du.user_id = ?
      ORDER BY w.created_at DESC
    `, [userId]);
  },

  /**
   * Cria um novo widget
   */
  create(data) {
    const { name, type, deviceId, config = {}, position = {} } = data;
    const configJson = JSON.stringify(config);
    const positionJson = JSON.stringify(position);

    run(`
      INSERT INTO widgets (name, type, device_id, config, position)
      VALUES (?, ?, ?, ?, ?)
    `, [name, type, deviceId, configJson, positionJson]);

    return queryOne(
      'SELECT * FROM widgets WHERE device_id = ? AND name = ? ORDER BY id DESC LIMIT 1',
      [deviceId, name]
    );
  },

  /**
   * Atualiza um widget
   */
  update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.deviceId !== undefined) {
      fields.push('device_id = ?');
      values.push(data.deviceId);
    }
    if (data.config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(data.config));
    }
    if (data.position !== undefined) {
      fields.push('position = ?');
      values.push(JSON.stringify(data.position));
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    run(`UPDATE widgets SET ${fields.join(', ')} WHERE id = ?`, values);
    
    return this.findById(id);
  },

  /**
   * Remove um widget
   */
  delete(id) {
    run('DELETE FROM widgets WHERE id = ?', [id]);
    return true;
  },

  /**
   * Converte para formato público (camelCase + parse JSON)
   */
  toPublic(widget) {
    if (!widget) return null;
    return {
      id: widget.id,
      name: widget.name,
      type: widget.type,
      deviceId: widget.device_id,
      config: typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config,
      position: typeof widget.position === 'string' ? JSON.parse(widget.position) : widget.position,
      createdAt: widget.created_at
    };
  }
};

module.exports = Widget;
