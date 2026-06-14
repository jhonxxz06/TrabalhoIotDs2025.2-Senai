const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const {
  loginSchema,
  registerSchema,
  joinDomainSchema,
  createDomainSchema,
  leaveDomainSchema
} = require('../schemas/auth.schema');
const { authenticate } = require('../middleware/auth.middleware');

// Rotas públicas
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autenticar usuário
 *     description: |
 *       Autentica o usuário com email, senha e código de domínio.
 *
 *       **Regras de domínio:**
 *       - Usuários vinculados a um domínio **devem** fornecer `domainCode`, que precisa
 *         corresponder ao domínio ao qual pertencem.
 *       - Usuários sem domínio (órfãos) podem logar sem `domainCode`, para então
 *         ingressar ou criar um domínio.
 *
 *       **Token retornado:** JWT válido por 24h (padrão). Envie-o no header
 *       `Authorization: Bearer <token>` nas rotas protegidas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             usuario_de_dominio:
 *               summary: Usuário ou admin de domínio
 *               value:
 *                 email: joao@empresa.com
 *                 password: senha123
 *                 domainCode: EMP01
 *     responses:
 *       200:
 *         description: Login realizado com sucesso. Retorna o token JWT e os dados públicos do usuário.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login realizado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT Bearer token. Inclua-o no header `Authorization` das próximas requisições.
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJqb2FvQGVtcHJlc2EuY29tIiwicm9sZSI6InVzZXIifQ.abc123
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: |
 *           `domainCode` ausente (obrigatório para usuários vinculados a um domínio) ou payload inválido.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               dominio_ausente:
 *                 summary: domainCode não informado
 *                 value:
 *                   success: false
 *                   error: Código do domínio é obrigatório
 *               payload_invalido:
 *                 summary: Validação Zod (email inválido)
 *                 value:
 *                   success: false
 *                   error: Dados inválidos
 *                   details:
 *                     - field: email
 *                       message: E-mail inválido
 *       401:
 *         description: Credenciais incorretas ou inconsistência de domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               credenciais_invalidas:
 *                 summary: Email ou senha incorretos
 *                 value:
 *                   success: false
 *                   error: E-mail ou senha inválidos
 *               dominio_invalido:
 *                 summary: Código de domínio não existe
 *                 value:
 *                   success: false
 *                   error: Código de domínio inválido
 *               dominio_diferente:
 *                 summary: Usuário não pertence ao domínio informado
 *                 value:
 *                   success: false
 *                   error: Você não pertence a este domínio
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validate(loginSchema), authController.login);

// Rotas protegidas
router.get('/me', authenticate, authController.me);
router.put('/profile', authenticate, authController.updateProfile);
router.delete('/account', authenticate, authController.deleteAccount);
router.put('/leave-domain', authenticate, validate(leaveDomainSchema), authController.leaveDomain);
router.put('/join-domain', authenticate, validate(joinDomainSchema), authController.joinDomain);
router.put('/create-domain', authenticate, validate(createDomainSchema), authController.createDomain);

module.exports = router;
