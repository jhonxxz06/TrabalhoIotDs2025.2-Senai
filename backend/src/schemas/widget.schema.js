const { z } = require('zod');

const widgetTypes = ['chart', 'gauge', 'table', 'card', 'map', 'line', 'bar', 'pie', 'doughnut'];

const createWidgetSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  deviceId: z.number().int().positive('Device ID inválido'),
  config: z.record(z.any()).optional().default({}),
  position: z.record(z.any()).optional().default({})
});

const updateWidgetSchema = createWidgetSchema.partial();

module.exports = {
  createWidgetSchema,
  updateWidgetSchema,
  widgetTypes
};
