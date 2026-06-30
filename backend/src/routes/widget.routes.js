const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widget.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createWidgetSchema, updateWidgetSchema } = require('../schemas/widget.schema');

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * @swagger
 * /api/widgets/:
 *   get:
 *     tags: [Widgets]
 *     summary: Listar widgets
 *     description: |
 *       - **Admin:** retorna todos os widgets dos dispositivos do seu domínio.
 *       - **Usuário:** retorna apenas os widgets dos dispositivos aos quais possui acesso.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de widgets retornada com sucesso.
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
 *                   example: Widgets listados com sucesso
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Widget'
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
router.get('/', widgetController.getAll);

/**
 * @swagger
 * /api/widgets/device/{deviceId}:
 *   get:
 *     tags: [Widgets]
 *     summary: Listar widgets de um dispositivo
 *     description: |
 *       Retorna todos os widgets vinculados a um dispositivo específico.
 *       O dispositivo deve pertencer ao mesmo domínio do usuário autenticado.
 *       Usuários comuns também precisam ter acesso explícito ao dispositivo.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo.
 *         example: 1
 *     responses:
 *       200:
 *         description: Widgets do dispositivo retornados com sucesso.
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
 *                   example: Widgets do dispositivo listados com sucesso
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Dispositivo pertence a outro domínio ou usuário sem acesso ao dispositivo.
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
router.get('/device/:deviceId', widgetController.getByDevice);

/**
 * @swagger
 * /api/widgets/{id}:
 *   get:
 *     tags: [Widgets]
 *     summary: Buscar widget por ID
 *     description: |
 *       Retorna os dados de um widget específico.
 *       O widget deve pertencer a um dispositivo do mesmo domínio do usuário autenticado.
 *       Usuários comuns também precisam ter acesso ao dispositivo vinculado ao widget.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do widget.
 *         example: 1
 *     responses:
 *       200:
 *         description: Widget encontrado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 widget:
 *                   $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Widget pertence a outro domínio ou usuário sem acesso ao dispositivo vinculado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Widget não encontrado.
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
router.get('/:id', widgetController.getById);

/**
 * @swagger
 * /api/widgets/:
 *   post:
 *     tags: [Widgets]
 *     summary: Criar widget
 *     description: Requer role admin. Cria um novo widget vinculado a um dispositivo do domínio.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWidgetRequest'
 *           example:
 *             name: Temperatura em tempo real
 *             type: line
 *             deviceId: 1
 *             config:
 *               field: temperature
 *               unit: "°C"
 *               color: "#4CAF50"
 *             position:
 *               x: 0
 *               y: 0
 *               w: 6
 *               h: 4
 *     responses:
 *       201:
 *         description: Widget criado com sucesso.
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
 *                   example: Widget criado com sucesso
 *                 widget:
 *                   $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou dispositivo pertence a outro domínio.
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
router.post('/', requireAdmin, validate(createWidgetSchema), widgetController.create);

/**
 * @swagger
 * /api/widgets/{id}:
 *   put:
 *     tags: [Widgets]
 *     summary: Atualizar widget
 *     description: |
 *       Requer role admin. Atualiza os dados de um widget do domínio.
 *       Todos os campos são opcionais (PATCH semântico via PUT).
 *       Se `config` for alterado, os contadores de notificação do widget são resetados.
 *       Se `deviceId` for alterado, valida que o novo dispositivo pertence ao mesmo domínio.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do widget a atualizar.
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateWidgetRequest'
 *     responses:
 *       200:
 *         description: Widget atualizado com sucesso.
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
 *                   example: Widget atualizado com sucesso
 *                 widget:
 *                   $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou widget/dispositivo pertence a outro domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Widget ou dispositivo não encontrado.
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
router.put('/:id', requireAdmin, validate(updateWidgetSchema), widgetController.update);

/**
 * @swagger
 * /api/widgets/{id}:
 *   delete:
 *     tags: [Widgets]
 *     summary: Remover widget
 *     description: Requer role admin. Remove um widget do domínio.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do widget a remover.
 *         example: 1
 *     responses:
 *       200:
 *         description: Widget removido com sucesso.
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
 *                   example: Widget removido com sucesso
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou widget pertence a outro domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Widget não encontrado.
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
router.delete('/:id', requireAdmin, widgetController.remove);

module.exports = router;
