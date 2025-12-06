const mqtt = require('mqtt');
const { run, query, queryOne } = require('../config/database');

// Armazena conexões ativas por dispositivo
const connections = new Map();

// Armazena último dado recebido por tópico (cache)
const latestData = new Map();

const MqttService = {
  /**
   * Conecta a um broker MQTT para um dispositivo
   */
  connect(device) {
    const { id, mqtt_broker, mqtt_port, mqtt_topic, mqtt_username, mqtt_password } = device;
    
    // Se já está conectado, retorna
    if (connections.has(id)) {
      console.log(`[MQTT] Device ${id} já conectado`);
      return connections.get(id);
    }

    // Usar protocolo TCP padrão (compatível com testclient-cloud.mqtt.cool)
    const brokerUrl = `mqtt://${mqtt_broker}:${mqtt_port || 1883}`;
    
    const options = {
      clientId: `iot_dashboard_${id}_${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      keepalive: 60,
    };

    // Adiciona auth se configurado
    if (mqtt_username) options.username = mqtt_username;
    if (mqtt_password) options.password = mqtt_password;

    console.log(`[MQTT] Conectando device ${id} a ${brokerUrl}...`);
    
    const client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
      console.log(`[MQTT] ✅ Device ${id} conectado a ${mqtt_broker}`);
      
      // Subscribe no tópico do dispositivo com QoS 1
      client.subscribe(mqtt_topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Erro ao subscrever ${mqtt_topic}:`, err);
        } else {
          console.log(`[MQTT] 📡 Subscrito em: ${mqtt_topic} (QoS 1)`);
          console.log(`[MQTT] 👂 Aguardando mensagens...`);
        }
      });
    });

    client.on('message', (topic, message) => {
      try {
        const payload = message.toString();
        console.log(`\n[MQTT] 📥 MENSAGEM RECEBIDA!`);
        console.log(`[MQTT] Device ID: ${id}`);
        console.log(`[MQTT] Tópico: ${topic}`);
        console.log(`[MQTT] Payload: ${payload}`);
        
        // Salva no cache
        latestData.set(topic, {
          payload,
          timestamp: new Date().toISOString()
        });

        // Salva no banco
        this.saveData(id, topic, payload);
        console.log(`[MQTT] ✅ Dados salvos no banco!\n`);
      } catch (error) {
        console.error('[MQTT] Erro ao processar mensagem:', error);
      }
    });

    client.on('error', (err) => {
      console.error(`[MQTT] ❌ Erro device ${id}:`, err.message);
    });

    client.on('close', () => {
      console.log(`[MQTT] Device ${id} desconectado`);
    });

    connections.set(id, client);
    return client;
  },

  /**
   * Desconecta um dispositivo
   */
  disconnect(deviceId) {
    if (connections.has(deviceId)) {
      const client = connections.get(deviceId);
      client.end();
      connections.delete(deviceId);
      console.log(`[MQTT] Device ${deviceId} desconectado manualmente`);
    }
  },

  /**
   * Desconecta todos os dispositivos
   */
  disconnectAll() {
    for (const [deviceId, client] of connections) {
      client.end();
      console.log(`[MQTT] Device ${deviceId} desconectado`);
    }
    connections.clear();
  },

  /**
   * Salva dados MQTT no banco
   */
  saveData(deviceId, topic, payload) {
    run(`
      INSERT INTO mqtt_data (device_id, topic, payload)
      VALUES (?, ?, ?)
    `, [deviceId, topic, payload]);
  },

  /**
   * Busca dados históricos de um dispositivo
   */
  getData(deviceId, options = {}) {
    const { limit = 100, since = null } = options;
    
    if (since) {
      return query(`
        SELECT * FROM mqtt_data 
        WHERE device_id = ? AND received_at >= ?
        ORDER BY received_at DESC
        LIMIT ?
      `, [deviceId, since, limit]);
    }
    
    return query(`
      SELECT * FROM mqtt_data 
      WHERE device_id = ?
      ORDER BY received_at DESC
      LIMIT ?
    `, [deviceId, limit]);
  },

  /**
   * Busca dados do último dia (para gráficos)
   */
  getDayData(deviceId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return this.getData(deviceId, { since: oneDayAgo, limit: 1000 });
  },

  /**
   * Busca dados da última semana (para Excel)
   */
  getWeekData(deviceId) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return this.getData(deviceId, { since: oneWeekAgo, limit: 10000 });
  },

  /**
   * Retorna último dado do cache
   */
  getLatest(topic) {
    return latestData.get(topic) || null;
  },

  /**
   * Retorna último dado do banco para um dispositivo
   */
  getLatestFromDb(deviceId) {
    return queryOne(`
      SELECT * FROM mqtt_data 
      WHERE device_id = ?
      ORDER BY received_at DESC
      LIMIT 1
    `, [deviceId]);
  },

  /**
   * Verifica se dispositivo está conectado
   */
  isConnected(deviceId) {
    const client = connections.get(deviceId);
    return client ? client.connected : false;
  },

  /**
   * Retorna status de todas as conexões
   */
  getStatus() {
    const status = {};
    for (const [deviceId, client] of connections) {
      status[deviceId] = {
        connected: client.connected,
        reconnecting: client.reconnecting
      };
    }
    return status;
  },

  /**
   * Limpa dados antigos (mais de 7 dias)
   */
  cleanOldData() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    run('DELETE FROM mqtt_data WHERE received_at < ?', [oneWeekAgo]);
    console.log('[MQTT] Dados antigos limpos');
  },

  /**
   * Busca excedências (valores fora dos thresholds definidos)
   * @param {number} deviceId - ID do dispositivo
   * @param {object} thresholds - Limites configurados { field1: {min, max}, field2: {min, max} }
   * @param {object} options - Opções (limit, since)
   * @returns {array} Registros com excedências
   */
  getExceedances(deviceId, thresholds = {}, options = {}) {
    const { limit = 100, since = null } = options;
    
    console.log('[MQTT] getExceedances chamado:', { deviceId, thresholds, options });
    
    // Se não há thresholds configurados, retorna array vazio
    if (!thresholds || Object.keys(thresholds).length === 0) {
      console.log('[MQTT] Nenhum threshold configurado');
      return [];
    }

    // Construir condições WHERE dinamicamente
    const conditions = [];
    const params = [deviceId];
    
    Object.entries(thresholds).forEach(([field, limits]) => {
      if (limits.min !== undefined && limits.min !== null && limits.min !== '') {
        conditions.push(`json_extract(payload, '$.${field}') < ?`);
        params.push(parseFloat(limits.min));
      }
      if (limits.max !== undefined && limits.max !== null && limits.max !== '') {
        conditions.push(`json_extract(payload, '$.${field}') > ?`);
        params.push(parseFloat(limits.max));
      }
    });

    if (conditions.length === 0) {
      console.log('[MQTT] Nenhuma condição gerada');
      return [];
    }

    console.log('[MQTT] Condições SQL:', conditions);
    console.log('[MQTT] Parâmetros:', params);

    // Montar query SQL
    let sql = `
      SELECT 
        id,
        device_id,
        topic,
        payload,
        received_at as timestamp
      FROM mqtt_data
      WHERE device_id = ?
        AND (${conditions.join(' OR ')})
    `;

    // Adicionar filtro de data se especificado
    if (since) {
      sql += ' AND received_at >= ?';
      params.push(since);
    }

    sql += ' ORDER BY received_at DESC LIMIT ?';
    params.push(limit);

    console.log('[MQTT] SQL completo:', sql);
    console.log('[MQTT] Parâmetros finais:', params);

    const results = query(sql, params);
    
    console.log('[MQTT] Resultados encontrados:', results.length);
    
    // Buscar TODOS os dados recentes para debug
    const allRecent = query(
      'SELECT id, payload, received_at FROM mqtt_data WHERE device_id = ? ORDER BY received_at DESC LIMIT 5',
      [deviceId]
    );
    console.log('[MQTT] Últimos 5 registros no banco:', allRecent.map(r => ({
      id: r.id,
      payload: r.payload,
      received_at: r.received_at
    })));
    
    // Testar manualmente se json_extract está funcionando
    if (allRecent.length > 0) {
      const testPayload = allRecent[0].payload;
      console.log('[MQTT] Teste json_extract com primeiro registro:', testPayload);
      Object.entries(thresholds).forEach(([field, limits]) => {
        const testQuery = `SELECT json_extract(?, '$.${field}') as value`;
        const testResult = query(testQuery, [testPayload]);
        console.log(`[MQTT] Campo '${field}' extraído:`, testResult[0]?.value, `(tipo: ${typeof testResult[0]?.value})`);
        if (limits.max) {
          console.log(`[MQTT] Comparação: ${testResult[0]?.value} > ${limits.max} = ${testResult[0]?.value > parseFloat(limits.max)}`);
        }
      });
    }

    // Adicionar informação de qual threshold foi excedido
    return results.map(row => {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      const alerts = [];

      Object.entries(thresholds).forEach(([field, limits]) => {
        const value = payload[field];
        if (value !== undefined && value !== null) {
          if (limits.min !== undefined && limits.min !== null && limits.min !== '' && value < parseFloat(limits.min)) {
            alerts.push({ field, type: 'below', value, threshold: limits.min });
          }
          if (limits.max !== undefined && limits.max !== null && limits.max !== '' && value > parseFloat(limits.max)) {
            alerts.push({ field, type: 'above', value, threshold: limits.max });
          }
        }
      });

      return {
        id: row.id,
        device_id: row.device_id,
        timestamp: row.timestamp,
        payload: row.payload,
        alerts
      };
    });
  }
};

module.exports = MqttService;
