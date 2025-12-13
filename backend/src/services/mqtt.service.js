const mqtt = require('mqtt');
const MqttData = require('../models/MqttData');

// Armazena conexões ativas por dispositivo
const connections = new Map();

// Armazena último dado recebido por tópico (cache)
const latestData = new Map();

// Instância do Socket.IO (será injetada)
let io = null;

const MqttService = {
  /**
   * Define instância do Socket.IO para emitir dados em tempo real
   */
  setSocketIO(socketIO) {
    io = socketIO;
    console.log('[MQTT] Socket.IO configurado para emissão em tempo real');
  },
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
        const timestamp = new Date().toISOString();
        
        console.log(`\n[MQTT] 📥 MENSAGEM RECEBIDA!`);
        console.log(`[MQTT] Device ID: ${id}`);
        console.log(`[MQTT] Tópico: ${topic}`);
        console.log(`[MQTT] Payload: ${payload}`);
        
        // Salva no cache
        latestData.set(topic, {
          payload,
          timestamp
        });

        // Salva no banco
        this.saveData(id, topic, payload);
        console.log(`[MQTT] ✅ Dados salvos no banco!`);
        
        // 🔥 Emite dados via WebSocket para clientes conectados
        if (io) {
          io.to(`device:${id}`).emit('mqtt:data', {
            deviceId: id,
            topic,
            payload,
            timestamp
          });
          console.log(`[MQTT] 🔌 Dados enviados via WebSocket para device:${id}\n`);
        } else {
          console.log(`[MQTT] ⚠️ Socket.IO não configurado - WebSocket desabilitado\n`);
        }
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
  async saveData(deviceId, topic, payload) {
    try {
      await MqttData.create(deviceId, topic, payload);
    } catch (error) {
      console.error('[MQTT] Erro ao salvar dados:', error);
    }
  },

  /**
   * Busca dados históricos de um dispositivo
   */
  async getData(deviceId, options = {}) {
    const { limit = 100, since = null } = options;
    
    if (since) {
      // findByDeviceId retorna todos, precisamos filtrar e limitar
      const allData = await MqttData.findByDeviceId(deviceId, limit);
      return allData.filter(d => new Date(d.received_at) >= new Date(since));
    }
    
    return await MqttData.findByDeviceId(deviceId, limit);
  },

  /**
   * Busca dados do último dia (para gráficos)
   */
  async getDayData(deviceId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return await this.getData(deviceId, { since: oneDayAgo, limit: 1000 });
  },

  /**
   * Busca dados da última semana (para Excel)
   */
  async getWeekData(deviceId) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return await this.getData(deviceId, { since: oneWeekAgo, limit: 10000 });
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
  async getLatestFromDb(deviceId) {
    const data = await MqttData.findRecent(deviceId, 1);
    return data.length > 0 ? data[0] : null;
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
  async cleanOldData() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await MqttData.deleteOld(oneWeekAgo);
    console.log('[MQTT] Dados antigos limpos');
  },

  /**
   * Busca excedências (valores fora dos thresholds definidos)
   * @param {string} deviceId - ID do dispositivo (UUID)
   * @param {object} thresholds - Limites configurados { field1: {min, max}, field2: {min, max} }
   * @param {object} options - Opções (limit, since)
   * @returns {array} Registros com excedências
   */
  async getExceedances(deviceId, thresholds = {}, options = {}) {
    const { limit = 100, since = null } = options;
    
    console.log('[MQTT] getExceedances chamado:', { deviceId, thresholds, options });
    
    // Se não há thresholds configurados, retorna array vazio
    if (!thresholds || Object.keys(thresholds).length === 0) {
      console.log('[MQTT] Nenhum threshold configurado');
      return [];
    }

    // Buscar dados recentes do dispositivo
    const allData = await this.getData(deviceId, { limit, since });
    
    console.log('[MQTT] Dados encontrados:', allData.length);

    // Filtrar dados que excedem os thresholds
    const exceedances = allData.filter(row => {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      
      // Verificar se algum campo excede os limites
      return Object.entries(thresholds).some(([field, limits]) => {
        const value = payload[field];
        if (value !== undefined && value !== null) {
          if (limits.min !== undefined && limits.min !== null && limits.min !== '' && value < parseFloat(limits.min)) {
            return true;
          }
          if (limits.max !== undefined && limits.max !== null && limits.max !== '' && value > parseFloat(limits.max)) {
            return true;
          }
        }
        return false;
      });
    });

    // Adicionar informação de qual threshold foi excedido
    return exceedances.map(row => {
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
        timestamp: row.received_at,
        payload: row.payload,
        alerts
      };
    });
  }
};

module.exports = MqttService;
