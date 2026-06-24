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

/**
 * Registra o webhook do bot no Telegram.
 * @param {string} baseUrl  URL pública do backend (sem barra final)
 * @param {string} secret   Valor do secret_token
 * @returns {Promise<boolean>}
 */
async function setWebhook(baseUrl, secret) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ['message']
      }),
      signal: AbortSignal.timeout(10000)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      console.error('[Telegram] Falha ao registrar webhook:', body?.description || `HTTP ${response.status}`);
      return false;
    }
    console.log(`[Telegram] Webhook registrado: ${webhookUrl}`);
    return true;
  } catch (error) {
    console.error('[Telegram] Erro ao registrar webhook:', error.message);
    return false;
  }
}

/**
 * Remove o webhook registrado (útil para debug/cleanup).
 * @returns {Promise<boolean>}
 */
async function deleteWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/deleteWebhook`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      console.error('[Telegram] Falha ao remover webhook:', body?.description || `HTTP ${response.status}`);
      return false;
    }
    console.log('[Telegram] Webhook removido');
    return true;
  } catch (error) {
    console.error('[Telegram] Erro ao remover webhook:', error.message);
    return false;
  }
}

module.exports = {
  sendMessage,
  formatAlertMessage,
  setWebhook,
  deleteWebhook
};
