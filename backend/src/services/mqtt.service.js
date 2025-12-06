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
  }
};

module.exports = MqttService;
