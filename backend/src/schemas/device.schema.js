const { z } = require('zod');

// Schema para criar dispositivo
const createDeviceSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  mqttBroker: z
    .string({ required_error: 'Broker MQTT é obrigatório' })
    .min(1, 'Broker MQTT é obrigatório'),
  mqttPort: z
    .string()
    .default('1883'),
  mqttTopic: z
    .string({ required_error: 'Tópico MQTT é obrigatório' })
    .min(1, 'Tópico MQTT é obrigatório'),
  mqttUsername: z
    .string()
    .optional(),
  mqttPassword: z
    .string()
    .optional(),
  assignedUsers: z
    .array(z.number())
    .optional()
});

// Schema para atualizar dispositivo
const updateDeviceSchema = createDeviceSchema.partial();

module.exports = {
  createDeviceSchema,
  updateDeviceSchema
};
