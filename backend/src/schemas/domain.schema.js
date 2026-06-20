const { z } = require('zod');

const updateTelegramSchema = z.object({
  chatId: z.string().min(1, 'chatId é obrigatório').nullable(),
  enabled: z.boolean()
});

module.exports = {
  updateTelegramSchema
};
