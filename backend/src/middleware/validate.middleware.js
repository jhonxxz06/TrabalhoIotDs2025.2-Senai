const { ZodError } = require('zod');

/**
 * Middleware de validação usando Zod
 * @param {import('zod').ZodSchema} schema - Schema Zod para validar
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Valida o body da requisição
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formata os erros do Zod
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: errors
        });
      }

      // Erro desconhecido
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };
};

module.exports = { validate };
