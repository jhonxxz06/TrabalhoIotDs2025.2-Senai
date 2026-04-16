const { z } = require('zod');

/**
 * Constrói um schema Zod dinamicamente com base nos campos numéricos esperados.
 *
 * Se nenhum campo for informado, retorna um schema que aceita qualquer objeto.
 *
 * @param {string[]} fields - Lista de campos esperados (ex: ['temperature', 'humidity'])
 * @returns {z.ZodTypeAny} Schema Zod para validação
 */
function buildPayloadSchema(fields = []) {
  if (!fields || fields.length === 0) {
    // Sem campos configurados explicitamente: garante que todos os valores inseridos sejam numéricos
    return z.record(z.number({
      invalid_type_error: 'Como não há campos configurados, todos os valores do payload devem ser números'
    }));
  }

  const shape = {};

  fields.forEach(field => {
    shape[field] = z.number({
      required_error: `Campo "${field}" é obrigatório no payload`,
      invalid_type_error: `Campo "${field}" deve ser um número (recebido tipo diferente)`
    });
  });

  // passthrough: permite campos extras além dos esperados (ex: outros sensores)
  return z.object(shape).passthrough();
}

module.exports = { buildPayloadSchema };
