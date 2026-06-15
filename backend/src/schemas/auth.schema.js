const { z } = require('zod');

// Schema para login
const loginSchema = z.object({
  email: z
    .string({ required_error: 'E-mail é obrigatório' })
    .email('E-mail inválido'),
  password: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(1, 'Senha é obrigatória')
});

// Schema para registro
const registerSchema = z.object({
  username: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z
    .string({ required_error: 'E-mail é obrigatório' })
    .email('E-mail inválido'),
  password: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres')
});

// Schema para solicitar acesso a um domínio existente (usuário sem domínio)
const joinDomainSchema = z.object({
  domainCode: z
    .string({ required_error: 'Código do domínio é obrigatório' })
    .min(1, 'Código do domínio é obrigatório'),
  requestedDevices: z
    .array(z.number())
    .optional()
});

// Schema para criar um novo domínio (usuário sem domínio)
const createDomainSchema = z.object({
  domainName: z
    .string({ required_error: 'Nome do domínio é obrigatório' })
    .min(1, 'Nome do domínio é obrigatório'),
  domainCode: z
    .string({ required_error: 'Código do domínio é obrigatório' })
    .min(1, 'Código do domínio é obrigatório')
});

// Schema para sair do domínio (com transferência de posse opcional)
const leaveDomainSchema = z.object({
  transferToUserId: z
    .number()
    .optional()
});

module.exports = {
  loginSchema,
  registerSchema,
  joinDomainSchema,
  createDomainSchema,
  leaveDomainSchema
};
