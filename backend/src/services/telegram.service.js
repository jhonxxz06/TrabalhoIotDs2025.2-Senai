// Encapsula a chamada à Telegram Bot API. Isolado para permitir futuros canais (whatsapp.service.js, etc).

const TELEGRAM_API_BASE = 'https://api.telegram.org';

let warnedMissingToken = false;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const THRESHOLD_TYPE_LABELS = {
  min: 'mínimo',
  max: 'máximo',
  below: 'mínimo',
  above: 'máximo'
};

/**
 * Monta a mensagem fixa de alerta de excedência.
 */
function formatAlertMessage({ domainName, deviceName, fieldName, value, thresholdType, thresholdValue, count, timestamp }) {
  const thresholdLabel = THRESHOLD_TYPE_LABELS[thresholdType] || thresholdType;

  return [
    '⚠️ Alerta Clean Air',
    `Domínio: ${escapeHtml(domainName)}`,
    `Dispositivo: ${escapeHtml(deviceName)}`,
    `Campo: ${escapeHtml(fieldName)}`,
    `Valor: ${escapeHtml(value)} (limite ${thresholdLabel}: ${escapeHtml(thresholdValue)})`,
    `Excedências no ciclo: ${count}`,
    `Horário: ${timestamp}`
  ].join('\n');
}

/**
 * Envia uma mensagem via Telegram Bot API (sendMessage).
 * @param {string} chatId
 * @param {string} text
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    if (!warnedMissingToken) {
      console.warn('[Telegram] TELEGRAM_BOT_TOKEN não configurado — notificações Telegram desativadas');
      warnedMissingToken = true;
    }
    return { success: false, error: 'TELEGRAM_BOT_TOKEN não configurado' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      }),
      signal: AbortSignal.timeout(10000)
    });

    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.ok) {
      const error = body?.description || `HTTP ${response.status}`;
      console.error('[Telegram] Erro ao enviar mensagem:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('[Telegram] Erro de rede ao enviar mensagem:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendMessage,
  formatAlertMessage
};
