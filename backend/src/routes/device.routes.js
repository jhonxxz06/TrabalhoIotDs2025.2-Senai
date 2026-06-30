const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createDeviceSchema, updateDeviceSchema } = require('../schemas/device.schema');

/**
 * @swagger
 * /api/devices/public:
 *   get:
 *     tags: [Devices]
 *     summary: Listar dispositivos públicos
 *     description: |
 *       Rota pública usada na tela de cadastro para popular o seletor de dispositivos.
 *       - **Sem token:** retorna todos os dispositivos do sistema (apenas `id` e `name`).
 *       - **Com token válido:** restringe ao domínio do usuário autenticado.
 *     security:
 *       - {}
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de dispositivos retornada com sucesso.
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
 *                   example: Dispositivos públicos listados com sucesso
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Sensor Sala 01
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/public', optionalAuth, deviceController.getPublicList);

// Todas as rotas abaixo requerem autenticação
router.use(authenticate);

/**
 * @swagger
 * /api/devices/:
 *   get:
 *     tags: [Devices]
 *     summary: Listar dispositivos
 *     description: |
 *       - **Admin:** retorna todos os dispositivos do seu domínio.
 *       - **Usuário:** retorna apenas os dispositivos aos quais possui acesso (via `device_users`).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de dispositivos retornada com sucesso.
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
 *                   example: Dispositivos listados com sucesso
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
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
router.get('/', deviceController.getAll);

/**
 * @swagger
 * /api/devices/{id}:
 *   get:
 *     tags: [Devices]
 *     summary: Buscar dispositivo por ID
 *     description: |
 *       Retorna os dados de um dispositivo específico.
 *       O dispositivo deve pertencer ao mesmo domínio do usuário autenticado.
 *       Usuários comuns também precisam ter acesso explícito ao dispositivo.
 *       Admins recebem adicionalmente o campo `assignedUsers` com a lista de usuários atribuídos.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo.
 *         example: 1
 *     responses:
 *       200:
 *         description: Dispositivo encontrado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 device:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Device'
 *                     - type: object
 *                       properties:
 *                         assignedUsers:
 *                           type: array
 *                           description: Usuários atribuídos ao dispositivo (apenas para admins).
 *                           items:
 *                             $ref: '#/components/schemas/User'
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
router.get('/:id', deviceController.getById);

/**
 * @swagger
 * /api/devices/:
 *   post:
 *     tags: [Devices]
 *     summary: Criar dispositivo
 *     description: |
 *       Requer role admin. Cria um novo dispositivo IoT.
 *       O dispositivo herda automaticamente o domínio do admin que o criou.
 *       Inicia a conexão MQTT automaticamente se `mqttBroker` e `mqttTopic` forem fornecidos.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDeviceRequest'
 *     responses:
 *       201:
 *         description: Dispositivo criado com sucesso.
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
 *                   example: Dispositivo criado com sucesso
 *                 device:
 *                   $ref: '#/components/schemas/Device'
 *       400:
 *         description: Limite de dispositivos do plano atingido ou dados inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou usuários atribuídos pertencem a outro domínio.
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
router.post('/', requireAdmin, validate(createDeviceSchema), deviceController.create);

/**
 * @swagger
 * /api/devices/{id}:
 *   put:
 *     tags: [Devices]
 *     summary: Atualizar dispositivo
 *     description: |
 *       Requer role admin. Atualiza os dados de um dispositivo do domínio.
 *       Todos os campos são opcionais (PATCH semântico via PUT).
 *       Se as credenciais MQTT mudarem, a conexão é reconectada automaticamente.
 *       Se `assignedUsers` for fornecido, recalcula os acessos: apenas novos usuários recebem `has_access = true`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo a atualizar.
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDeviceRequest'
 *     responses:
 *       200:
 *         description: Dispositivo atualizado com sucesso.
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
 *                   example: Dispositivo atualizado com sucesso
 *                 device:
 *                   $ref: '#/components/schemas/Device'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin, dispositivo pertence a outro domínio ou usuários atribuídos inválidos.
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
router.put('/:id', requireAdmin, validate(updateDeviceSchema), deviceController.update);

/**
 * @swagger
 * /api/devices/{id}:
 *   delete:
 *     tags: [Devices]
 *     summary: Remover dispositivo
 *     description: Requer role admin. Remove um dispositivo do domínio. A conexão MQTT é encerrada antes da exclusão.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo a remover.
 *         example: 1
 *     responses:
 *       200:
 *         description: Dispositivo removido com sucesso.
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
 *                   example: Dispositivo removido com sucesso
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
router.delete('/:id', requireAdmin, deviceController.remove);

/**
 * @swagger
 * /api/devices/{id}/users:
 *   put:
 *     tags: [Devices]
 *     summary: Atualizar usuários atribuídos ao dispositivo
 *     description: |
 *       Requer role admin. Define a lista completa de usuários com acesso ao dispositivo.
 *       A lista substitui a anterior integralmente.
 *       Apenas usuários recém-adicionados recebem `has_access = true` automaticamente.
 *       Todos os usuários devem pertencer ao mesmo domínio do admin.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo.
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Lista completa de IDs dos usuários a ter acesso ao dispositivo.
 *                 example: [3, 5, 7]
 *     responses:
 *       200:
 *         description: Usuários atualizados com sucesso.
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
 *                   example: Usuários atualizados com sucesso
 *                 assignedUsers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       400:
 *         description: '`userIds` não é um array.'
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
 *         description: Usuário não possui role admin, dispositivo pertence a outro domínio ou usuários inválidos.
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
router.put('/:id/users', requireAdmin, deviceController.updateUsers);

module.exports = router;
