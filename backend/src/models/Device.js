const { run, query, queryOne } = require('../config/database');

const Device = {
  /**
   * Busca dispositivo por ID
   */
  findById(id) {
    return queryOne('SELECT * FROM devices WHERE id = ?', [id]);
  },

  /**
   * Lista todos os dispositivos
   */
  findAll() {
    return query('SELECT * FROM devices ORDER BY created_at DESC');
  },

  /**
   * Lista dispositivos de um usuário específico
   */
  findByUserId(userId) {
    return query(`
      SELECT d.* FROM devices d
      INNER JOIN device_users du ON d.id = du.device_id
      WHERE du.user_id = ?
      ORDER BY d.created_at DESC
    `, [userId]);
  },

  /**
   * Cria um novo dispositivo
   */
  create(data) {
    const { 
      name, 
      mqttBroker, 
      mqttPort = '1883', 
      mqttTopic, 
      mqttUsername = '', 
      mqttPassword = '' 
    } = data;

    run(`
      INSERT INTO devices (name, mqtt_broker, mqtt_port, mqtt_topic, mqtt_username, mqtt_password)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, mqttBroker, mqttPort, mqttTopic, mqttUsername, mqttPassword]);

    // Busca o dispositivo recém-criado pelo tópico (único por broker)
    return queryOne(
      'SELECT * FROM devices WHERE mqtt_broker = ? AND mqtt_topic = ? ORDER BY id DESC LIMIT 1',
      [mqttBroker, mqttTopic]
    );
  },

  /**
   * Atualiza um dispositivo
   */
  update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.mqttBroker !== undefined) {
      fields.push('mqtt_broker = ?');
      values.push(data.mqttBroker);
    }
    if (data.mqttPort !== undefined) {
      fields.push('mqtt_port = ?');
      values.push(data.mqttPort);
    }
    if (data.mqttTopic !== undefined) {
      fields.push('mqtt_topic = ?');
      values.push(data.mqttTopic);
    }
    if (data.mqttUsername !== undefined) {
      fields.push('mqtt_username = ?');
      values.push(data.mqttUsername);
    }
    if (data.mqttPassword !== undefined) {
      fields.push('mqtt_password = ?');
      values.push(data.mqttPassword);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    run(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`, values);
    
    return this.findById(id);
  },

  /**
   * Remove um dispositivo
   */
  delete(id) {
    run('DELETE FROM devices WHERE id = ?', [id]);
    return true;
  },

  /**
   * Retorna usuários atribuídos a um dispositivo
   */
  getAssignedUsers(deviceId) {
    return query(`
      SELECT u.id, u.username, u.email 
      FROM users u
      INNER JOIN device_users du ON u.id = du.user_id
      WHERE du.device_id = ?
    `, [deviceId]);
  },

  /**
   * Atribui usuários a um dispositivo
   */
  setAssignedUsers(deviceId, userIds) {
    // Remove todos os usuários atuais
    run('DELETE FROM device_users WHERE device_id = ?', [deviceId]);
    
    // Adiciona os novos usuários
    for (const userId of userIds) {
      run(
        'INSERT INTO device_users (device_id, user_id) VALUES (?, ?)',
        [deviceId, userId]
      );
    }
    
    return this.getAssignedUsers(deviceId);
  },

  /**
   * Verifica se um usuário tem acesso a um dispositivo
   */
  userHasAccess(deviceId, userId) {
    const result = queryOne(
      'SELECT 1 FROM device_users WHERE device_id = ? AND user_id = ?',
      [deviceId, userId]
    );
    return !!result;
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
      createdAt: device.created_at
    };
  }
};

module.exports = Device;
