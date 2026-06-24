const { run, query } = require('../config/database');
const Widget = require('../models/Widget');
const Domain = require('../models/Domain');
const telegramService = require('./telegram.service');

// Cache em memória dos widgets por device, para evitar consultar o banco em toda mensagem MQTT
const widgetCacheByDevice = new Map();

// Contadores de excedência em memória, chave `${widgetId}:${fieldName}`
const counters = new Map();

// Cooldown simples para evitar chamadas HTTP repetidas quando o Telegram está fora do ar
const COOLDOWN_MS = 30 * 1000;
const lastFailedAt = new Map();

function counterKey(widgetId, fieldName) {
  return `${widgetId}:${fieldName}`;
}

function formatBrasiliaTimestamp() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

/**
 * Carrega os widgets de um device (do cache ou do banco) com o config já parseado.
 */
async function getWidgetsForDevice(deviceId) {
  if (widgetCacheByDevice.has(deviceId)) {
    return widgetCacheByDevice.get(deviceId);
  }

  const rows = await Widget.findByDeviceId(deviceId);
  const widgets = rows.map(row => {
    let config = {};
    try {
      config = typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {});
    } catch (error) {
      console.error(`[Notification] Config inválido no widget ${row.id}:`, error.message);
    }
    return { id: row.id, device_id: row.device_id, name: row.name, config };
  });

  widgetCacheByDevice.set(deviceId, widgets);
  return widgets;
}

/**
 * Verifica se um valor excede o min/max configurado para o campo no widget.
 */
function checkExceedance(fieldConfig, rawValue) {
  if (!fieldConfig) return null;

  const value = Number(rawValue);
  if (Number.isNaN(value)) return null;

  if (fieldConfig.min !== undefined && fieldConfig.min !== null && fieldConfig.min !== '' && value < Number(fieldConfig.min)) {
    return { type: 'min', thresholdValue: Number(fieldConfig.min) };
  }
  if (fieldConfig.max !== undefined && fieldConfig.max !== null && fieldConfig.max !== '' && value > Number(fieldConfig.max)) {
    return { type: 'max', thresholdValue: Number(fieldConfig.max) };
  }
  return null;
}

/**
 * Incrementa o contador (banco como fonte de verdade, memória como cache) e retorna o novo valor.
 */
async function incrementCounter(widgetId, fieldName) {
  const result = await run(`
    INSERT INTO exceedance_counters (widget_id, field_name, count)
    VALUES ($1, $2, 1)
    ON CONFLICT (widget_id, field_name)
    DO UPDATE SET count = exceedance_counters.count + 1, updated_at = CURRENT_TIMESTAMP
    RETURNING count
  `, [widgetId, fieldName]);

  const count = result.rows[0].count;
  counters.set(counterKey(widgetId, fieldName), count);
  return count;
}

/**
 * Reseta (zera) o contador de um par widget+campo após envio bem-sucedido.
 */
async function clearCounter(widgetId, fieldName) {
  await run(
    'UPDATE exceedance_counters SET count = 0, updated_at = CURRENT_TIMESTAMP WHERE widget_id = $1 AND field_name = $2',
    [widgetId, fieldName]
  );
  counters.set(counterKey(widgetId, fieldName), 0);
}

/**
 * Processa um único campo monitorado de um widget: verifica excedência, conta e decide se notifica.
 */
async function processField(widget, fieldName, telegramFieldConfig, configFieldsMap, device, payload) {
  const fieldConfig = configFieldsMap[fieldName];
  if (!fieldConfig) return;

  const value = payload[fieldName];
  if (value === undefined || value === null) return;

  const exceedance = checkExceedance(fieldConfig, value);
  if (!exceedance) return;

  const count = await incrementCounter(widget.id, fieldName);
  const threshold = telegramFieldConfig.threshold;

  if (count < threshold) return;

  const cooldownKey = counterKey(widget.id, fieldName);
  const lastFailure = lastFailedAt.get(cooldownKey);
  if (lastFailure && (Date.now() - lastFailure) < COOLDOWN_MS) {
    return;
  }

  const domain = device.domain_id ? await Domain.findById(device.domain_id) : null;

  // Notificações Telegram são exclusivas do plano Empresarial
  if (!domain || domain.plan !== 'empresarial') return;

  if (!domain.telegram_enabled || !domain.telegram_chat_id) {
    lastFailedAt.set(cooldownKey, Date.now());
    return;
  }

  const timestamp = formatBrasiliaTimestamp();
  const message = telegramService.formatAlertMessage({
    domainName: domain.name,
    deviceName: device.name,
    fieldName,
    value,
    thresholdType: exceedance.type,
    thresholdValue: exceedance.thresholdValue,
    count,
    timestamp
  });

  const result = await telegramService.sendMessage(domain.telegram_chat_id, message);

  if (result.success) {
    lastFailedAt.delete(cooldownKey);
    await clearCounter(widget.id, fieldName);
    await run(`
      INSERT INTO notification_log
        (domain_id, device_id, widget_id, field_name, value_read, threshold_value, threshold_type, channel, message_sent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'telegram', $8)
    `, [domain.id, device.id, widget.id, fieldName, value, exceedance.thresholdValue, exceedance.type, message]);
  } else {
    lastFailedAt.set(cooldownKey, Date.now());
    console.error(`[Notification] Falha ao enviar Telegram (widget ${widget.id}, campo ${fieldName}):`, result.error);
  }
}

/**
 * Verifica excedências de um payload MQTT recém-persistido contra os widgets do device.
 * Nunca lança exceções — falhas aqui não devem afetar o pipeline MQTT principal.
 */
async function check(device, payload) {
  try {
    if (!device || !device.domain_id || !payload || typeof payload !== 'object') return;

    const widgets = await getWidgetsForDevice(device.id);

    for (const widget of widgets) {
      try {
        const telegramConfig = widget.config?.notifications?.telegram;
        if (!telegramConfig?.enabled) continue;

        const telegramFields = telegramConfig.fields || {};
        const configFieldsMap = {};
        (widget.config.fields || []).forEach(f => { configFieldsMap[f.name] = f; });

        for (const fieldName of Object.keys(telegramFields)) {
          await processField(widget, fieldName, telegramFields[fieldName], configFieldsMap, device, payload);
        }
      } catch (widgetError) {
        console.error(`[Notification] Erro ao processar widget ${widget.id}:`, widgetError.message);
      }
    }
  } catch (error) {
    console.error('[Notification] Erro na verificação de excedências:', error.message);
  }
}

/**
 * Reseta os contadores de um widget (chamado quando o admin atualiza o config do widget).
 */
async function resetCounters(widgetId) {
  try {
    await run('DELETE FROM exceedance_counters WHERE widget_id = $1', [widgetId]);
    for (const key of counters.keys()) {
      if (key.startsWith(`${widgetId}:`)) counters.delete(key);
    }
  } catch (error) {
    console.error(`[Notification] Erro ao resetar contadores do widget ${widgetId}:`, error.message);
  }
}

/**
 * Invalida o cache de widgets de um device (chamado quando widgets são criados/atualizados/removidos).
 */
function refreshWidgetCache(deviceId) {
  widgetCacheByDevice.delete(deviceId);
}

/**
 * Carrega os contadores existentes do banco para a memória no startup.
 */
async function init() {
  try {
    const rows = await query('SELECT widget_id, field_name, count FROM exceedance_counters');
    rows.forEach(row => counters.set(counterKey(row.widget_id, row.field_name), row.count));
    console.log(`[Notification] ${rows.length} contador(es) de excedência carregado(s) do banco`);
  } catch (error) {
    console.error('[Notification] Erro ao carregar contadores do banco:', error.message);
  }
}

module.exports = {
  check,
  resetCounters,
  refreshWidgetCache,
  init
};
