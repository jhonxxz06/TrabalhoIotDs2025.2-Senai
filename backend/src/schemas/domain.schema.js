const { z } = require('zod');

const updateTelegramSchema = z.object({
  chatId: z.string().min(1, 'chatId é obrigatório').nullable(),
  enabled: z.boolean()
});

const updateDomainSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  code: z
    .string()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código muito longo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Código deve conter apenas letras, números, _ ou -')
});

module.exports = {
  updateTelegramSchema,
  updateDomainSchema
};
