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

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastrar novo usuário
 *     description: |
 *       Cria uma nova conta de usuário. O fluxo varia conforme `isManager`:
 *
 *       **Fluxo gerente (`isManager = true`):**
 *       - Cria o domínio com `domainName` + `domainCode` (únicos no sistema).
 *       - Cria o usuário com `role = admin` e acesso liberado automaticamente.
 *
 *       **Fluxo usuário comum (`isManager = false`):**
 *       - Valida que o domínio com `domainCode` existe.
 *       - Cria o usuário com `role = user` e acesso pendente de aprovação do admin.
 *       - Cria solicitações de acesso para os dispositivos em `requestedDevices`
 *         (ou uma solicitação geral se a lista estiver vazia).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             gerente:
 *               summary: Cadastro como gerente (cria domínio)
 *               value:
 *                 username: João Silva
 *                 email: joao@empresa.com
 *                 password: senha123
 *                 isManager: true
 *                 domainName: Empresa ABC
 *                 domainCode: ABC01
 *             usuario:
 *               summary: Cadastro como usuário (ingressa em domínio)
 *               value:
 *                 username: Maria Souza
 *                 email: maria@empresa.com
 *                 password: senha456
 *                 isManager: false
 *                 domainCode: ABC01
 *                 requestedDevices: [1, 2]
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso. Retorna token JWT e dados públicos do usuário.
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
 *                   example: Usuário cadastrado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: E-mail já cadastrado, código de domínio já utilizado ou dados obrigatórios ausentes.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Domínio não encontrado (fluxo de usuário comum com `domainCode` inválido).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Dados do usuário autenticado
 *     description: Retorna os dados públicos do usuário logado, incluindo estatísticas do domínio quando aplicável (`domainUserCount`, `domainUserLimit`, `domainPlan`, `domainMaxDevices`).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             domainUserCount:
 *                               type: integer
 *                               description: Total de usuários no domínio.
 *                               example: 5
 *                             domainUserLimit:
 *                               type: integer
 *                               nullable: true
 *                               description: Limite de usuários do plano atual.
 *                               example: 10
 *                             domainPlan:
 *                               type: string
 *                               example: gratuito
 *                             domainMaxDevices:
 *                               type: integer
 *                               example: 3
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuário não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authenticate, authController.me);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Atualizar perfil do usuário autenticado
 *     description: |
 *       Atualiza `username`, `email` e/ou senha do usuário logado.
 *       Para alterar a senha, `currentPassword` e `newPassword` são obrigatórios.
 *       Pelo menos um campo deve ser informado.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Novo nome de exibição.
 *                 example: João Silva Atualizado
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Novo endereço de e-mail.
 *                 example: joao.novo@empresa.com
 *               currentPassword:
 *                 type: string
 *                 description: Senha atual (obrigatória apenas ao alterar a senha).
 *                 example: senha123
 *               newPassword:
 *                 type: string
 *                 description: Nova senha desejada (mínimo 6 caracteres).
 *                 example: novaSenha456
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso.
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
 *                   example: Perfil atualizado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Nenhum campo informado, senha atual ausente ou senha atual incorreta.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuário não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @swagger
 * /api/auth/account:
 *   delete:
 *     tags: [Auth]
 *     summary: Excluir conta do usuário autenticado
 *     description: Remove permanentemente a conta do usuário logado. Operação irreversível.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Conta excluída com sucesso.
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
 *                   example: Conta excluída com sucesso
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuário não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/account', authenticate, authController.deleteAccount);

/**
 * @swagger
 * /api/auth/leave-domain:
 *   put:
 *     tags: [Auth]
 *     summary: Sair do domínio atual
 *     description: |
 *       Remove o usuário autenticado do seu domínio. O comportamento varia conforme o papel:
 *
 *       - **Usuário comum:** sai diretamente e fica sem domínio (órfão).
 *       - **Admin com outros admins:** sai diretamente; o `admin_id` do domínio é transferido automaticamente.
 *       - **Único admin com outros membros:** deve informar `transferToUserId`. Se omitido, a resposta retorna `requiresTransfer: true` com a lista de candidatos.
 *       - **Único membro do domínio:** não é possível sair (domínio ficaria sem dono).
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveDomainRequest'
 *     responses:
 *       200:
 *         description: Saiu do domínio com sucesso, ou aguarda transferência de posse.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Saiu com sucesso.
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Você saiu do domínio com sucesso
 *                 - type: object
 *                   description: Transferência de posse necessária.
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     requiresTransfer:
 *                       type: boolean
 *                       example: true
 *                     candidates:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       400:
 *         description: Usuário sem domínio, transferência inválida ou único membro do domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/leave-domain', authenticate, validate(leaveDomainSchema), authController.leaveDomain);

/**
 * @swagger
 * /api/auth/join-domain:
 *   put:
 *     tags: [Auth]
 *     summary: Ingressar em um domínio existente
 *     description: |
 *       Usuário sem domínio (órfão) solicita acesso a um domínio existente informando seu código.
 *       O usuário entra com `has_access = false` e aguarda aprovação do admin do domínio.
 *       Solicitações de acesso são criadas para os dispositivos em `requestedDevices`
 *       (ou uma solicitação geral se a lista estiver vazia).
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinDomainRequest'
 *     responses:
 *       200:
 *         description: Solicitação de acesso enviada com sucesso.
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
 *                   example: Solicitação de acesso enviada com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Usuário já pertence a um domínio ou limite de usuários atingido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Domínio não encontrado para o código informado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/join-domain', authenticate, validate(joinDomainSchema), authController.joinDomain);

/**
 * @swagger
 * /api/auth/create-domain:
 *   put:
 *     tags: [Auth]
 *     summary: Criar novo domínio
 *     description: |
 *       Usuário sem domínio (órfão) cria seu próprio domínio e torna-se automaticamente admin.
 *       Retorna um novo token JWT com o `role = admin` atualizado.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDomainRequest'
 *     responses:
 *       200:
 *         description: Domínio criado com sucesso. Retorna novo token e dados atualizados do usuário.
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
 *                   example: Domínio criado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: Novo JWT com role=admin. Substitua o token anterior.
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Usuário já pertence a um domínio ou código de domínio já utilizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/create-domain', authenticate, validate(createDomainSchema), authController.createDomain);

module.exports = router;
