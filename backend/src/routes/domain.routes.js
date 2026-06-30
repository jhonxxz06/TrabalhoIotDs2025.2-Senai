const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domain.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateTelegramSchema, updateDomainSchema } = require('../schemas/domain.schema');

/**
 * @swagger
 * /api/domains/verify/{code}:
 *   get:
 *     tags: [Domains]
 *     summary: Verificar se um código de domínio existe
 *     description: Rota pública. Verifica se o código de domínio informado existe e retorna o nome do domínio e seus dispositivos. Usado na tela de cadastro para popular o seletor de dispositivos.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código único do domínio.
 *         example: ABC01
 *     responses:
 *       200:
 *         description: Domínio encontrado com sucesso.
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
 *                     domain:
 *                       $ref: '#/components/schemas/Domain'
 *                     devices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: Sensor Sala 01
 *       400:
 *         description: Código de domínio não informado.
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
router.get('/verify/:code', domainController.verify);

/**
 * @swagger
 * /api/domains/:
 *   get:
 *     tags: [Domains]
 *     summary: Listar domínio do usuário autenticado
 *     description: Retorna o domínio ao qual o usuário autenticado pertence (com contagem de dispositivos). Retorna array vazio se o usuário não pertencer a nenhum domínio.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Domínio retornado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Domain'
 *                       - type: object
 *                         properties:
 *                           deviceCount:
 *                             type: integer
 *                             description: Número de dispositivos no domínio.
 *                             example: 3
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
router.get('/', authenticate, domainController.getAll);

/**
 * @swagger
 * /api/domains/{id}/devices:
 *   get:
 *     tags: [Domains]
 *     summary: Listar dispositivos de um domínio
 *     description: Retorna os dispositivos pertencentes a um domínio. O usuário autenticado deve pertencer ao mesmo domínio informado.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do domínio.
 *         example: 1
 *     responses:
 *       200:
 *         description: Dispositivos do domínio retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *       403:
 *         description: Usuário não pertence ao domínio informado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Domínio não encontrado.
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
router.get('/:id/devices', authenticate, domainController.getDevices);

/**
 * @swagger
 * /api/domains/{id}/users:
 *   get:
 *     tags: [Domains]
 *     summary: Listar usuários de um domínio
 *     description: Retorna os usuários pertencentes a um domínio. O usuário autenticado deve pertencer ao mesmo domínio. Usado para popular a seção "Usuários com Acesso" no modal de edição de dispositivo.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do domínio.
 *         example: 1
 *     responses:
 *       200:
 *         description: Usuários do domínio retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não pertence ao domínio informado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Domínio não encontrado.
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
router.get('/:id/users', authenticate, domainController.getUsers);

/**
 * @swagger
 * /api/domains/{id}:
 *   put:
 *     tags: [Domains]
 *     summary: Atualizar domínio
 *     description: |
 *       Requer role admin. Atualiza o nome e o código do domínio.
 *       O usuário autenticado deve pertencer ao domínio informado.
 *       Alterar o código não remove membros (o vínculo é pelo `domain_id`, não pelo código).
 *       Se o novo código já estiver em uso, retorna 409.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do domínio a atualizar.
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDomainRequest'
 *     responses:
 *       200:
 *         description: Domínio atualizado com sucesso.
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
 *                   example: Domínio atualizado com sucesso
 *                 data:
 *                   $ref: '#/components/schemas/Domain'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou não pertence ao domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Domínio não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Código de domínio já está em uso.
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
router.put('/:id', authenticate, requireAdmin, validate(updateDomainSchema), domainController.updateDomain);

/**
 * @swagger
 * /api/domains/{id}:
 *   delete:
 *     tags: [Domains]
 *     summary: Excluir domínio
 *     description: |
 *       Requer role admin. Exclui o domínio e todos os dados associados em cascata
 *       (usuários, dispositivos, widgets, solicitações de acesso, dados MQTT, configurações de Telegram).
 *       Operação irreversível. Somente o admin do próprio domínio pode executar esta ação.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do domínio a excluir.
 *         example: 1
 *     responses:
 *       200:
 *         description: Domínio e todos os dados associados excluídos com sucesso.
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
 *                   example: Domínio e todos os dados associados foram excluídos com sucesso
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou não pertence ao domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Domínio não encontrado.
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
router.delete('/:id', authenticate, requireAdmin, domainController.deleteDomain);

/**
 * @swagger
 * /api/domains/{id}/plan:
 *   put:
 *     tags: [Domains]
 *     summary: Atualizar plano do domínio
 *     description: Requer role admin. Atualiza o plano SaaS do domínio, alterando os limites de usuários e dispositivos.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do domínio.
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 description: Nome do plano a aplicar.
 *                 example: pro
 *     responses:
 *       200:
 *         description: Plano atualizado com sucesso.
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
 *                   example: Plano atualizado para pro
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Domain'
 *                     - type: object
 *                       properties:
 *                         deviceCount:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou não pertence ao domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Domínio não encontrado.
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
router.put('/:id/plan', authenticate, requireAdmin, domainController.updatePlan);

/**
 * @swagger
 * /api/domains/{id}/telegram:
 *   get:
 *     tags: [Domains]
 *     summary: Obter configuração do Telegram
 *     description: Requer role admin. Retorna a configuração de notificações via Telegram do domínio, incluindo o código de verificação ativo (se existir e não tiver expirado).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do domínio.
 *         example: 1
 *     responses:
 *       200:
 *         description: Configuração do Telegram retornada com sucesso.
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
 *                     chatId:
 *                       type: string
 *                       nullable: true
 *                       description: ID do chat/grupo Telegram conectado.
 *                       example: "-1001234567890"
 *                     chatName:
 *                       type: string
 *                       nullable: true
 *                       description: Nome do grupo Telegram conectado.
 *                       example: Grupo CleanAir
 *                     enabled:
 *                       type: boolean
 *                       description: Se as notificações via Telegram estão ativas.
 *                       example: true
 *                     verificationCode:
 *                       type: string
 *                       nullable: true
 *                       description: Código de verificação ativo (null se não houver ou expirado).
 *                       example: A3F9C1
 *                     verificationExpiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Data de expiração do código de verificação.
 *                       example: "2025-03-15T15:00:00.000Z"
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou não pertence ao domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Domínio não encontrado.
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
router.get('/:id/telegram', authenticate, requireAdmin, domainController.getTelegramConfig);

/**
 * @swagger
 * /api/domains/{id}/telegram:
 *   put:
 *     tags: [Domains]
 *     summary: Atualizar configuração do Telegram
 *     description: Requer role admin. Atualiza o `chatId` e o estado `enabled` das notificações via Telegram para o domínio.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do domínio.
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTelegramRequest'
 *     responses:
 *       200:
 *         description: Configuração do Telegram atualizada com sucesso.
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
 *                   example: Configuração do Telegram atualizada
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou não pertence ao domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Domínio não encontrado.
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
router.put('/:id/telegram', authenticate, requireAdmin, validate(updateTelegramSchema), domainController.updateTelegramConfig);

/**
 * @swagger
 * /api/domains/{id}/telegram/generate-code:
 *   post:
 *     tags: [Domains]
 *     summary: Gerar código de verificação para o Telegram
 *     description: |
 *       Requer role admin. Gera um código de verificação de 6 caracteres válido por 15 minutos.
 *       Se já existir um código ativo e não expirado, retorna o mesmo código (evita criação duplicada).
 *       O admin envia o comando `/conectar CÓDIGO` no grupo Telegram para vincular o grupo ao domínio.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do domínio.
 *         example: 1
 *     responses:
 *       200:
 *         description: Código de verificação gerado (ou reutilizado) com sucesso.
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
 *                     code:
 *                       type: string
 *                       description: Código de 6 caracteres a ser enviado no Telegram.
 *                       example: A3F9C1
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Data e hora de expiração do código.
 *                       example: "2025-03-15T15:00:00.000Z"
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou não pertence ao domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Domínio não encontrado.
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
router.post('/:id/telegram/generate-code', authenticate, requireAdmin, domainController.generateVerificationCode);

module.exports = router;
