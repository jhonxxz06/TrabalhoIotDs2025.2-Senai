const { z } = require('zod');

const widgetTypes = ['chart', 'gauge', 'table', 'card', 'map', 'line', 'bar', 'pie', 'doughnut'];

// Configuração de notificações por campo dentro do config do widget.
// Campo ausente em `fields` = sem notificação para esse campo.
const notificationsSchema = z.object({
  telegram: z.object({
    enabled: z.boolean(),
    fields: z.record(z.string(), z.object({
      threshold: z.number().int().positive('Threshold deve ser um inteiro positivo')
    })).optional().default({})
  }).optional()
}).optional();

// Permite quaisquer outras chaves do config (fields, etc.), validando `notifications` quando presente
const configSchema = z.object({
  notifications: notificationsSchema
}).passthrough();

const createWidgetSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  deviceId: z.number().int().positive('Device ID inválido'),
  config: configSchema.optional().default({}),
  position: z.record(z.any()).optional().default({})
});

const updateWidgetSchema = createWidgetSchema.partial();

module.exports = {
  createWidgetSchema,
  updateWidgetSchema,
  widgetTypes
};
