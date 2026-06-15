const { run, query, queryOne } = require('../config/database');

const Widget = {
  /**
   * Busca widget por ID
   */
  async findById(id) {
    return await queryOne('SELECT * FROM widgets WHERE id = $1', [id]);
  },

  /**
   * Lista todos os widgets
   */
  async findAll() {
    return await query('SELECT * FROM widgets ORDER BY created_at DESC');
  },

  /**
   * Lista widgets de um dispositivo
   */
  async findByDeviceId(deviceId) {
    return await query('SELECT * FROM widgets WHERE device_id = $1 ORDER BY created_at DESC', [deviceId]);
  },

  /**
   * Lista widgets dos dispositivos pertencentes a um domínio
   */
  async findByDomainId(domainId) {
    return await query(`
      SELECT w.* FROM widgets w
      INNER JOIN devices d ON w.device_id = d.id
      WHERE d.domain_id = $1
      ORDER BY w.created_at DESC
    `, [domainId]);
  },

  /**
   * Lista widgets acessíveis por um usuário (via dispositivos atribuídos)
   */
  async findByUserId(userId) {
    return await query(`
      SELECT w.* FROM widgets w
      INNER JOIN devices d ON w.device_id = d.id
      INNER JOIN device_users du ON d.id = du.device_id
      WHERE du.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId]);
  },

  /**
   * Cria um novo widget
   */
  async create(data) {
    const { name, type, deviceId, config = {}, position = {} } = data;
    const configJson = JSON.stringify(config);
    const positionJson = JSON.stringify(position);

    await run(`
      INSERT INTO widgets (name, type, device_id, config, position)
      VALUES ($1, $2, $3, $4, $5)
    `, [name, type, deviceId, configJson, positionJson]);

    return await queryOne(
      'SELECT * FROM widgets WHERE device_id = $1 AND name = $2 ORDER BY id DESC LIMIT 1',
      [deviceId, name]
    );
  },

  /**
   * Atualiza um widget
   */
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push(`name = $${fields.length + 1}`);
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push(`type = $${fields.length + 1}`);
      values.push(data.type);
    }
    if (data.deviceId !== undefined) {
      fields.push(`device_id = $${fields.length + 1}`);
      values.push(data.deviceId);
    }
    if (data.config !== undefined) {
      fields.push(`config = $${fields.length + 1}`);
      values.push(JSON.stringify(data.config));
    }
    if (data.position !== undefined) {
      fields.push(`position = $${fields.length + 1}`);
      values.push(JSON.stringify(data.position));
    }

    if (fields.length === 0) return await this.findById(id);

    values.push(id);
    await run(`UPDATE widgets SET ${fields.join(', ')} WHERE id = $${fields.length + 1}`, values);
    
    return await this.findById(id);
  },

  /**
   * Remove um widget
   */
  async delete(id) {
    await run('DELETE FROM widgets WHERE id = $1', [id]);
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
