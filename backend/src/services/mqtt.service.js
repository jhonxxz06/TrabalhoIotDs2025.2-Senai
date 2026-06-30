const mqtt = require('mqtt');
const { run, query, queryOne, pool } = require('../config/database');
const { validateMqttPayload } = require('./mqtt-payload.validator');
const notificationService = require('./notification.service');

// ============================================
// Helper: Converter data para Brasília (UTC-3)
// ============================================
function getBrasiliaTime() {
  const date = new Date();
  // Usar Intl para obter as partes no fuso America/Sao_Paulo
  const fmt = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = fmt.formatToParts(date);
  const map = {};
  parts.forEach(p => { if (p.type !== 'literal') map[p.type] = p.value; });
  // Monta string ISO local (sem informação de fuso) apropriada para coluna TIMESTAMP
  const y = map.year, m = map.month, d = map.day, h = map.hour, min = map.minute, s = map.second;
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

// Armazena conexões ativas por dispositivo
const connections = new Map();

// Armazena último dado recebido por tópico (cache)
const latestData = new Map();

// Buffer circular de payloads rejeitados por dispositivo (máx. 100 por device)
const rejectedPayloads = new Map();

// Deduplicação in-memory: evita processar retransmissões QoS 1 duplicadas.
// JS é single-threaded, então Map ops são atômicas — sem race condition.
const recentMessages = new Map();
const DEDUP_WINDOW_MS = 15000; // 15 segundos

function normalizePayload(rawPayload) {
  // Compara apenas os campos de valor, ignorando campos que mudam por mensagem
  // (ex: timestamp, millis, uptime) para detectar duplicatas mesmo com payload levemente diferente
  try {
    const parsed = JSON.parse(rawPayload);
    // Filtrar apenas campos numéricos (dados de sensor) e ordenar chaves
    const numericFields = {};
    Object.keys(parsed).sort().forEach(k => {
      const v = parsed[k];
      if (typeof v === 'number') numericFields[k] = v;
    });
    return JSON.stringify(numericFields);
  } catch (e) {
    return rawPayload;
  }
}

function isDuplicateMessage(deviceId, payload) {
  const key = `${deviceId}:${normalizePayload(payload)}`;
  const now = Date.now();
  const lastSeen = recentMessages.get(key);
  if (lastSeen !== undefined && (now - lastSeen) < DEDUP_WINDOW_MS) {
    return true;
  }
  recentMessages.set(key, now);
  // Limpeza periódica para evitar memory leak
  if (recentMessages.size > 500) {
    for (const [k, t] of recentMessages) {
      if (now - t > DEDUP_WINDOW_MS * 2) recentMessages.delete(k);
    }
  }
  return false;
}

// Instância do Socket.IO (será injetada)
let io = null;

/**
 * Adiciona uma entrada ao buffer circular de payloads rejeitados do dispositivo.
 * @param {number} deviceId
 * @param {object} entry
 */
function addRejected(deviceId, entry) {
  if (!rejectedPayloads.has(deviceId)) {
    rejectedPayloads.set(deviceId, []);
  }
  const buf = rejectedPayloads.get(deviceId);
  buf.unshift(entry); // mais recente primeiro
  if (buf.length > 100) buf.pop();
}

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

    // Parsear campos esperados para validação de payload
    let expectedFields = [];
    try {
      const raw = device.expected_fields || '[]';
      expectedFields = Array.isArray(raw) ? raw : JSON.parse(raw);
    } catch {
      expectedFields = [];
    }

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
      resubscribe: false,
    };

    // Adiciona auth se configurado
    if (mqtt_username) options.username = mqtt_username;
    if (mqtt_password) options.password = mqtt_password;

    console.log(`[MQTT] Conectando device ${id} a ${brokerUrl}...`);

    const client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
      console.log(`[MQTT]  Device ${id} conectado a ${mqtt_broker}`);

      // Subscribe no tópico do dispositivo com QoS 1
      client.subscribe(mqtt_topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Erro ao subscrever ${mqtt_topic}:`, err);
        } else {
          console.log(`[MQTT]  Subscrito em: ${mqtt_topic} (QoS 1)`);
          console.log(`[MQTT]  Aguardando mensagens...`);
        }
      });
    });

    client.on('message', (topic, message, packet) => {
      try {
        // Descartar retransmissões QoS 1 sinalizadas pelo broker (flag DUP do protocolo MQTT)
        if (packet && packet.dup) {
          console.log(`[MQTT] Retransmissão QoS 1 (DUP=true) ignorada para device ${id}`);
          return;
        }

        const payload = message.toString();
        // Usar timestamp UTC ISO para emissões em tempo real
        const timestampIso = new Date().toISOString();

        // Deduplicação in-memory: descarta payloads com mesmos valores numéricos dentro da janela
        if (isDuplicateMessage(id, payload)) {
          console.log(`[MQTT] Mensagem duplicada ignorada (device ${id})`);
          return;
        }

        console.log(`\n[MQTT]  MENSAGEM RECEBIDA!`);
        console.log(`[MQTT] Device ID: ${id}`);
        console.log(`[MQTT] Tópico: ${topic}`);
        console.log(`[MQTT] Payload: ${payload}`);

        // ── Validação de payload ──────────────────────────────────────────
        const validation = validateMqttPayload(payload, expectedFields);

        if (!validation.valid) {
          console.warn(`[MQTT]  PAYLOAD REJEITADO — Device ${id} | Tópico: ${topic}`);
          console.warn(`[MQTT] Motivo: ${validation.reason}`);
          console.warn(`[MQTT] Payload recebido: ${payload}`);

          // Armazena no buffer de rejeições para diagnóstico
          const rejectedEntry = {
            deviceId: id,
            topic,
            payload,
            reason: validation.reason,
            errors: validation.errors || [],
            timestamp: timestampIso
          };
          addRejected(id, rejectedEntry);

          // Notifica frontend via WebSocket
          if (io) {
            io.to(`device:${id}`).emit('mqtt:validation_error', rejectedEntry);
          }

          return; // ← Não salva no banco nem emite mqtt:data
        }
        // ─────────────────────────────────────────────────────────────────

        // Salva no cache (timestamp em UTC ISO)
        latestData.set(topic, {
          payload,
          timestamp: timestampIso
        });

        // Salva no banco (sem await dentro do callback) — deixar o Postgres atribuir received_at (UTC)
        this.saveData(id, topic, payload).catch(err => {
          console.error('[MQTT]  Erro ao salvar dados:', err);
        });
        console.log(`[MQTT]  Dados salvos no banco!`);

        // Verificação de excedências para notificação (fire-and-forget, não bloqueia o pipeline)
        notificationService.check(device, validation.data).catch(err => {
          console.error('[Notification] Erro na verificação:', err.message);
        });

        // Emite dados via WebSocket para clientes conectados com timestamp UTC
        if (io) {
          io.to(`device:${id}`).emit('mqtt:data', {
            deviceId: id,
            topic,
            payload,
            timestamp: timestampIso
          });
          console.log(`[MQTT]  Dados enviados via WebSocket para device:${id}\n`);
        } else {
          console.log(`[MQTT]  Socket.IO não configurado - WebSocket desabilitado\n`);
        }
      } catch (error) {
        console.error('[MQTT] Erro ao processar mensagem:', error);
      }
    });

    client.on('error', (err) => {
      console.error(`[MQTT]  Erro device ${id}:`, err.message);
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
    // Normaliza o payload para objeto e gera string com chaves ordenadas para comparação estável
    const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const sortedStr = (obj) => {
      const s = {};
      Object.keys(obj).sort().forEach(k => { s[k] = obj[k]; });
      return JSON.stringify(s);
    };
    const payloadStr = sortedStr(payloadObj);

    // Use a transaction with an advisory lock per device to prevent race inserts
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Acquire an advisory transaction-scoped lock for this device id
      await client.query('SELECT pg_advisory_xact_lock($1)', [deviceId]);

      // Re-check last record inside the lock
      const lastRes = await client.query(
        'SELECT id, payload, received_at FROM mqtt_data WHERE device_id = $1 ORDER BY received_at DESC LIMIT 1',
        [deviceId]
      );

      if (lastRes.rows && lastRes.rows.length > 0) {
        const last = lastRes.rows[0];
        const lastPayloadStr = sortedStr(typeof last.payload === 'string' ? JSON.parse(last.payload) : last.payload);
        const lastTime = last.received_at ? new Date(last.received_at).getTime() : 0;
        const now = Date.now();
        const delta = Math.abs(now - lastTime);
        if (lastPayloadStr === payloadStr && delta < 10000) {
          console.log(`[MQTT] ⚠️ Duplicate payload detected for device ${deviceId} (delta=${delta}ms) - skipping DB insert`);
          await client.query('COMMIT');
          return;
        }
      }

      // Insert new record
      await client.query(
        'INSERT INTO mqtt_data (device_id, topic, payload) VALUES ($1, $2, $3)',
        [deviceId, topic, payloadObj]
      );

      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (e) { }
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Busca dados históricos de um dispositivo
   */
  async getData(deviceId, options = {}) {
    const { limit = 100, since = null } = options;

    if (since) {
      return await query(`
        SELECT 
          id, device_id, topic, payload, received_at,
          to_char(received_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') as "Data",
          to_char(received_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') as "Hora"
        FROM mqtt_data 
        WHERE device_id = $1 AND received_at >= $2
        ORDER BY received_at DESC
        LIMIT $3
      `, [deviceId, since, limit]);
    }

    return await query(`
      SELECT 
        id, device_id, topic, payload, received_at,
        to_char(received_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') as "Data",
        to_char(received_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') as "Hora"
      FROM mqtt_data 
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
   * Busca dados do dia atual (meia-noite de Brasília até agora)
   */
  async getTodayData(deviceId) {
    const now = new Date();
    // UTC+0: meia-noite de Brasília (UTC-3) equivale a 03:00 UTC
    const midnightBrasilia = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0)
    );
    // Se ainda não passamos das 03:00 UTC (antes da meia-noite BRT), recuamos um dia
    if (midnightBrasilia > now) midnightBrasilia.setUTCDate(midnightBrasilia.getUTCDate() - 1);
    return await this.getData(deviceId, { since: midnightBrasilia.toISOString(), limit: 10000 });
  },

  /**
   * Busca dados em um intervalo arbitrário de datas
   */
  async getDataRange(deviceId, from, to, limit = 10000) {
    return await query(`
      SELECT id, device_id, topic, payload, received_at,
        to_char(received_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') as "Data",
        to_char(received_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') as "Hora"
      FROM mqtt_data
      WHERE device_id = $1 AND received_at >= $2 AND received_at <= $3
      ORDER BY received_at DESC
      LIMIT $4
    `, [deviceId, from, to, limit]);
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
    const { limit = 100, since = null, until = null } = options;

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
        conditions.push(`(payload->>'${field}')::float < $${paramCount++}`);
        params.push(parseFloat(limits.min));
      }
      if (limits.max !== undefined && limits.max !== null && limits.max !== '') {
        conditions.push(`(payload->>'${field}')::float > $${paramCount++}`);
        params.push(parseFloat(limits.max));
      }
    });

    if (conditions.length === 0) {
      console.log('[MQTT] Nenhuma condição gerada');
      return [];
    }

    console.log('[MQTT] Condições SQL:', conditions);
    console.log('[MQTT] Parâmetros:', params);

    // Montar query SQL — subquery com DISTINCT ON elimina duplicatas de payload no mesmo segundo
    let sql = `
      SELECT id, device_id, topic, payload, timestamp FROM (
        SELECT DISTINCT ON (date_trunc('second', received_at), payload)
          id,
          device_id,
          topic,
          payload,
          received_at AS timestamp
        FROM mqtt_data
        WHERE device_id = $1
          AND (${conditions.join(' OR ')})
    `;

    // Adicionar filtros de data se especificados
    if (since) {
      sql += ` AND received_at >= $${paramCount++}`;
      params.push(since);
    }
    if (until) {
      sql += ` AND received_at <= $${paramCount++}`;
      params.push(until);
    }

    // Fechar subquery e ordenar/limitar no resultado externo
    sql += ` ORDER BY date_trunc('second', received_at) DESC, payload
      ) AS deduped
      ORDER BY timestamp DESC LIMIT $${paramCount}`;
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
        const payload = row.payload;
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
  },

  /**
   * Retorna o buffer de payloads rejeitados de um dispositivo (máx. 100 entradas).
   * @param {number} deviceId
   * @returns {object[]}
   */
  getRejected(deviceId) {
    return rejectedPayloads.get(deviceId) || [];
  }
};

module.exports = MqttService;
