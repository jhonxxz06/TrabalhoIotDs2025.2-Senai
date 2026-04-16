const { buildPayloadSchema } = require('../schemas/mqtt-payload.schema');

/**
 * Valida um payload MQTT bruto (string) antes de ser inserido no banco.
 *
 * A função é SÍNCRONA e não faz I/O — garantindo latência mínima no fluxo MQTT.
 *
 * Verificações realizadas (em ordem):
 *  1. JSON.parse — rejeita mensagens com sintaxe inválida (vírgulas faltando, etc.)
 *  2. Estrutura — o resultado deve ser um objeto simples (não array, não null)
 *  3. Campos — se o dispositivo tem `expectedFields` configurados, valida cada campo
 *     via Zod: devem estar presentes e ser numéricos.
 *
 * @param {string} rawMessage      - Payload bruto recebido do broker MQTT
 * @param {string[]} expectedFields - Campos esperados no objeto (ex: ['temperature', 'humidity'])
 *
 * @returns {{ valid: true,  data: object }}
 *        | {{ valid: false, reason: string, errors?: Array<{field: string, message: string}> }}
 */
function validateMqttPayload(rawMessage, expectedFields = []) {
  // ─── Etapa 1: Parsear o JSON ──────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(rawMessage);
  } catch (err) {
    return {
      valid: false,
      reason: `JSON inválido — verifique vírgulas e aspas no payload. Detalhe: ${err.message}`
    };
  }

  // ─── Etapa 2: Verificar que é um objeto simples ───────────────────────────
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      reason: 'Payload deve ser um objeto JSON (ex: {"campo": valor}), não um array ou valor simples'
    };
  }

  // ─── Etapa 3: Validar campos com Zod (configurados ou fallback numérico genérico) ─
  const schema = buildPayloadSchema(expectedFields);
  const result = schema.safeParse(parsed);

  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      field: e.path.join('.') || '(raiz)',
      message: e.message
    }));

    return {
      valid: false,
      reason: `Campos ou tipos inválidos: ${errors.map(e => `"${e.field}" — ${e.message}`).join(' | ')}`,
      errors
    };
  }

  return { valid: true, data: result.data };
}

module.exports = { validateMqttPayload };
