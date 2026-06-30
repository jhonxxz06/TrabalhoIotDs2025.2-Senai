const express = require('express');
const router = express.Router();
const accessController = require('../controllers/access.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * @swagger
 * /api/access/:
 *   get:
 *     tags: [Access]
 *     summary: Listar solicitações de acesso
 *     description: |
 *       - **Admin:** retorna todas as solicitações do seu domínio, com filtro opcional por `status`.
 *       - **Usuário:** retorna apenas suas próprias solicitações, com filtro opcional por `status`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filtra solicitações pelo status.
 *         example: pending
 *     responses:
 *       200:
 *         description: Lista de solicitações retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccessRequest'
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
router.get('/', accessController.getAll);

/**
 * @swagger
 * /api/access/pending/count:
 *   get:
 *     tags: [Access]
 *     summary: Contar solicitações pendentes
 *     description: Requer role admin. Retorna a contagem de solicitações com status `pending` no domínio do admin. Usado para exibir o badge de notificação na interface.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Contagem retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Número de solicitações pendentes.
 *                   example: 3
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin.
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
router.get('/pending/count', requireAdmin, accessController.countPending);

/**
 * @swagger
 * /api/access/:
 *   post:
 *     tags: [Access]
 *     summary: Criar solicitação de acesso
 *     description: |
 *       Cria uma solicitação de acesso para um dispositivo específico ou uma solicitação geral ao sistema.
 *       - Se `deviceId` for omitido, cria uma solicitação geral (aprovação dá acesso a todos os devices do domínio).
 *       - Se `deviceId` for informado, cria uma solicitação para aquele dispositivo específico.
 *       Não é possível criar uma solicitação duplicada (pendente) para o mesmo alvo.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: integer
 *                 nullable: true
 *                 description: ID do dispositivo. Se omitido, cria uma solicitação geral.
 *                 example: 2
 *               message:
 *                 type: string
 *                 nullable: true
 *                 description: Mensagem opcional para o admin.
 *                 example: Preciso acompanhar os dados deste sensor.
 *     responses:
 *       201:
 *         description: Solicitação criada com sucesso.
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
 *                   example: Solicitação enviada com sucesso
 *                 request:
 *                   $ref: '#/components/schemas/AccessRequest'
 *       400:
 *         description: Usuário já possui acesso, já tem solicitação pendente ou já tem acesso ao dispositivo específico.
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
 *       403:
 *         description: Dispositivo pertence a outro domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Dispositivo não encontrado.
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
router.post('/', accessController.create);

/**
 * @swagger
 * /api/access/{id}/approve:
 *   put:
 *     tags: [Access]
 *     summary: Aprovar solicitação de acesso
 *     description: |
 *       Requer role admin. Aprova uma solicitação de acesso pendente do domínio.
 *       Efeitos da aprovação:
 *       - O usuário recebe `has_access = true`.
 *       - Se for solicitação para dispositivo específico: usuário é adicionado ao `device_users` daquele device.
 *       - Se for solicitação geral (`deviceId = null`): usuário é adicionado a **todos** os dispositivos do domínio.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da solicitação a aprovar.
 *         example: 1
 *     responses:
 *       200:
 *         description: Solicitação aprovada com sucesso.
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
 *                   example: Solicitação aprovada com sucesso
 *       400:
 *         description: Solicitação já foi processada anteriormente.
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
 *       403:
 *         description: Usuário não possui role admin ou solicitação pertence a outro domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Solicitação não encontrada.
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
router.put('/:id/approve', requireAdmin, accessController.approve);

/**
 * @swagger
 * /api/access/{id}/reject:
 *   put:
 *     tags: [Access]
 *     summary: Rejeitar solicitação de acesso
 *     description: Requer role admin. Rejeita uma solicitação de acesso pendente do domínio. O usuário não recebe acesso.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da solicitação a rejeitar.
 *         example: 1
 *     responses:
 *       200:
 *         description: Solicitação rejeitada com sucesso.
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
 *                   example: Solicitação rejeitada
 *       400:
 *         description: Solicitação já foi processada anteriormente.
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
 *       403:
 *         description: Usuário não possui role admin ou solicitação pertence a outro domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Solicitação não encontrada.
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
router.put('/:id/reject', requireAdmin, accessController.reject);

module.exports = router;
