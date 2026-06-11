const { z } = require('zod');

// Schema para atualização de papel (role) de um usuário do domínio
const roleUpdateSchema = z.object({
  role: z.enum(['admin', 'user'], {
    required_error: 'Papel é obrigatório',
    invalid_type_error: "Papel deve ser 'admin' ou 'user'"
  })
});

module.exports = {
  roleUpdateSchema
};
