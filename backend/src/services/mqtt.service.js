const mqtt = require('mqtt');
const { run, query, queryOne } = require('../config/database');

// ============================================
// Helper: Converter data para Brasília (UTC-3)
// ============================================
function getBrasiliaTime() {
  const now = new Date();
  // Criar data em Brasília subtraindo 3 horas
  const brasiliaTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  // Converter para string ISO no fuso horário de Brasília
  // Formato: YYYY-MM-DDTHH:mm:ss.sssZ -> YYYY-MM-DDTHH:mm:ss.sss-03:00
  const iso = brasiliaTime.toISOString();
  // Substituir Z por -03:00 para indicar o fuso
  return iso.replace('Z', '-03:00');
}

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
        const timestamp = getBrasiliaTime();
        
        console.log(`\n[MQTT] 📥 MENSAGEM RECEBIDA!`);
        console.log(`[MQTT] Device ID: ${id}`);
        console.log(`[MQTT] Tópico: ${topic}`);
        console.log(`[MQTT] Payload: ${payload}`);
        
        // Salva no cache
        latestData.set(topic, {
          payload,
          timestamp
        });

        // Salva no banco (sem await dentro do callback)
        this.saveData(id, topic, payload).catch(err => {
          console.error('[MQTT] ❌ Erro ao salvar dados:', err);
        });
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
    // Usar timestamp atual em Brasília (UTC-3)
    const timestamp = getBrasiliaTime();
    await run(`
      INSERT INTO mqtt_data (device_id, topic, payload, received_at)
      VALUES ($1, $2, $3, $4)
    `, [deviceId, topic, payload, timestamp]);
  },

  /**
   * Busca dados históricos de um dispositivo
   */
  async getData(deviceId, options = {}) {
    const { limit = 100, since = null } = options;
    
    if (since) {
      return await query(`
        SELECT * FROM mqtt_data 
        WHERE device_id = $1 AND received_at >= $2
        ORDER BY received_at DESC
        LIMIT $3
      `, [deviceId, since, limit]);
    }
    
    return await query(`
      SELECT * FROM mqtt_data 
      WHERE device_id = $1
      ORDER BY received_at DESC
      LIMIT $2
    `, [deviceId, limit]);
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
    return await queryOne(`
      SELECT * FROM mqtt_data 
      WHERE device_id = $1
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
  async cleanOldData() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await run('DELETE FROM mqtt_data WHERE received_at < $1', [oneWeekAgo]);
    console.log('[MQTT] Dados antigos limpos');
  },

  /**
   * Busca excedências (valores fora dos thresholds definidos)
   * @param {number} deviceId - ID do dispositivo
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

    // Construir condições WHERE dinamicamente
    const conditions = [];
    const params = [deviceId];
    let paramCount = 2; // Começando em 2 porque $1 é o deviceId
    
    Object.entries(thresholds).forEach(([field, limits]) => {
      if (limits.min !== undefined && limits.min !== null && limits.min !== '') {
        conditions.push(`((payload::jsonb)->>'${field}')::float < $${paramCount++}`);
        params.push(parseFloat(limits.min));
      }
      if (limits.max !== undefined && limits.max !== null && limits.max !== '') {
        conditions.push(`((payload::jsonb)->>'${field}')::float > $${paramCount++}`);
        params.push(parseFloat(limits.max));
      }
    });

    if (conditions.length === 0) {
      console.log('[MQTT] Nenhuma condição gerada');
      return [];
    }

    console.log('[MQTT] Condições SQL:', conditions);
    console.log('[MQTT] Parâmetros:', params);

    // Montar query SQL (usando operadores JSONB do PostgreSQL)
    let sql = `
      SELECT 
        id,
        device_id,
        topic,
        payload,
        received_at as timestamp
      FROM mqtt_data
      WHERE device_id = $1
        AND (${conditions.join(' OR ')})
    `;

    // Adicionar filtro de data se especificado
    if (since) {
      sql += ` AND received_at >= $${paramCount++}`;
      params.push(since);
    }

    sql += ` ORDER BY received_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    console.log('[MQTT] SQL completo:', sql);
    console.log('[MQTT] Parâmetros finais:', params);

    try {
      const results = await query(sql, params);
      
      console.log('[MQTT] Resultados encontrados:', results.length);
      
      // Buscar TODOS os dados recentes para debug
      const allRecent = await query(
        'SELECT id, payload, received_at FROM mqtt_data WHERE device_id = $1 ORDER BY received_at DESC LIMIT 5',
        [deviceId]
      );
      console.log('[MQTT] Últimos 5 registros no banco:', allRecent.map(r => ({
        id: r.id,
        payload: r.payload,
        received_at: r.received_at
      })));
      
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

        // Normalizar e também fornecer Data/Hora em fuso de Brasília para consumo (CSV/table)
        const receivedAt = row.timestamp || row.received_at;
        const dateObj = new Date(receivedAt);
        const Data = dateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const Hora = dateObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        return {
          id: row.id,
          device_id: row.device_id,
          // Normalizar timestamp para string ISO (UTC)
          timestamp: new Date(receivedAt).toISOString(),
          Data,
          Hora,
          payload: row.payload,
          alerts
        };
      });
    } catch (err) {
      console.error('[MQTT] Erro ao executar query:', err);
      console.error('[MQTT] SQL:', sql);
      console.error('[MQTT] Params:', params);
      throw err;
    }
  }
};

module.exports = MqttService;
