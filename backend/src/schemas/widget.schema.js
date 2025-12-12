const { z } = require('zod');

const widgetTypes = ['chart', 'gauge', 'table', 'card', 'map', 'line', 'bar', 'pie', 'doughnut'];

// ✅ VALIDAÇÃO DETALHADA DE CONFIG JSONB (#2)
const configSchema = z.object({
  mqttField: z.string().max(100).optional(),
  mqttField2: z.string().max(100).optional(),
  data: z.object({
    labels: z.array(z.string()).optional(),
    datasets: z.array(z.any()).optional()
  }).optional(),
  options: z.any().optional(),
  type: z.string().optional()
}).passthrough(); // Permite campos extras para flexibilidade

// ✅ VALIDAÇÃO DETALHADA DE POSITION JSONB (#2)
const positionSchema = z.object({
  x: z.number().int().min(0).max(10000).optional(),
  y: z.number().int().min(0).max(10000).optional(),
  width: z.number().int().min(1).max(2000).optional(),
  height: z.number().int().min(1).max(2000).optional()
}).passthrough(); // Permite campos extras

const createWidgetSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  type: z.string().min(1, 'Tipo é obrigatório'),
  deviceId: z.number().int().positive('Device ID inválido'),
  config: configSchema.optional().default({}),
  position: positionSchema.optional().default({})
});

const updateWidgetSchema = createWidgetSchema.partial();

module.exports = {
  createWidgetSchema,
  updateWidgetSchema,
  widgetTypes,
  configSchema,
  positionSchema
};
