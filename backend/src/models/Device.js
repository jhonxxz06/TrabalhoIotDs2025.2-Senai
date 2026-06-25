const { run, query, queryOne } = require('../config/database');

const Device = {
  /**
   * Busca dispositivo por ID
   */
  async findById(id) {
    return await queryOne('SELECT * FROM devices WHERE id = $1', [id]);
  },

  /**
   * Lista todos os dispositivos
   */
  async findAll() {
    return await query('SELECT * FROM devices ORDER BY created_at DESC');
  },

  /**
   * Lista dispositivos de um usuário específico
   */
  async findByUserId(userId) {
    return await query(`
      SELECT d.* FROM devices d
      INNER JOIN device_users du ON d.id = du.device_id
      WHERE du.user_id = $1
      ORDER BY d.created_at DESC
    `, [userId]);
  },

  /**
   * Cria um novo dispositivo
   */
  async create(data) {
    const { 
      name, 
      mqttBroker, 
      mqttPort = '1883', 
      mqttTopic, 
      mqttUsername = '', 
      mqttPassword = '',
      domain_id = null
    } = data;

    await run(`
      INSERT INTO devices (name, mqtt_broker, mqtt_port, mqtt_topic, mqtt_username, mqtt_password, domain_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [name, mqttBroker, mqttPort, mqttTopic, mqttUsername, mqttPassword, domain_id]);

    // Busca o dispositivo recém-criado pelo tópico (único por broker)
    return await queryOne(
      'SELECT * FROM devices WHERE mqtt_broker = $1 AND mqtt_topic = $2 ORDER BY id DESC LIMIT 1',
      [mqttBroker, mqttTopic]
    );
  },

  /**
   * Lista dispositivos de um domínio específico
   */
  async findByDomainId(domainId) {
    return await query(
      'SELECT * FROM devices WHERE domain_id = $1 ORDER BY created_at DESC',
      [domainId]
    );
  },

  /**
   * Atualiza um dispositivo
   */
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push(`name = $${fields.length + 1}`);
      values.push(data.name);
    }
    if (data.mqttBroker !== undefined) {
      fields.push(`mqtt_broker = $${fields.length + 1}`);
      values.push(data.mqttBroker);
    }
    if (data.mqttPort !== undefined) {
      fields.push(`mqtt_port = $${fields.length + 1}`);
      values.push(data.mqttPort);
    }
    if (data.mqttTopic !== undefined) {
      fields.push(`mqtt_topic = $${fields.length + 1}`);
      values.push(data.mqttTopic);
    }
    if (data.mqttUsername !== undefined) {
      fields.push(`mqtt_username = $${fields.length + 1}`);
      values.push(data.mqttUsername);
    }
    if (data.mqttPassword !== undefined) {
      fields.push(`mqtt_password = $${fields.length + 1}`);
      values.push(data.mqttPassword);
    }

    if (fields.length === 0) return await this.findById(id);

    values.push(id);
    await run(`UPDATE devices SET ${fields.join(', ')} WHERE id = $${fields.length + 1}`, values);
    
    return await this.findById(id);
  },

  /**
   * Remove um dispositivo
   */
  async delete(id) {
    await run('DELETE FROM devices WHERE id = $1', [id]);
    return true;
  },

  /**
   * Retorna usuários atribuídos a um dispositivo
   */
  async getAssignedUsers(deviceId) {
    return await query(`
      SELECT u.id, u.username, u.email 
      FROM users u
      INNER JOIN device_users du ON u.id = du.user_id
      WHERE du.device_id = $1
    `, [deviceId]);
  },

  /**
   * Atribui usuários a um dispositivo
   */
  async setAssignedUsers(deviceId, userIds) {
    // Remove todos os usuários atuais
    await run('DELETE FROM device_users WHERE device_id = $1', [deviceId]);
    
    // Adiciona os novos usuários
    for (const userId of userIds) {
      await run(
        'INSERT INTO device_users (device_id, user_id) VALUES ($1, $2)',
        [deviceId, userId]
      );
    }
    
    return await this.getAssignedUsers(deviceId);
  },

  /**
   * Verifica se um usuário tem acesso a um dispositivo
   */
  async userHasAccess(deviceId, userId) {
    const result = await queryOne(
      'SELECT 1 FROM device_users WHERE device_id = $1 AND user_id = $2',
      [deviceId, userId]
    );
    return !!result;
  },

  /**
   * Remove todo o acesso de um usuário a dispositivos (usado ao remover/saída de domínio)
   */
  async removeAllUserAccess(userId) {
    await run('DELETE FROM device_users WHERE user_id = $1', [userId]);
  },

  /**
   * Converte para formato público (camelCase)
   */
  toPublic(device) {
    if (!device) return null;
    return {
      id: device.id,
      name: device.name,
      mqttBroker: device.mqtt_broker,
      mqttPort: device.mqtt_port,
      mqttTopic: device.mqtt_topic,
      mqttUsername: device.mqtt_username,
      mqttPassword: device.mqtt_password,
      domainId: device.domain_id ?? null,
      createdAt: device.created_at
    };
  }
};

module.exports = Device;
