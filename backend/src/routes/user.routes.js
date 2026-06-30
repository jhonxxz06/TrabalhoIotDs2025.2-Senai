const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { roleUpdateSchema } = require('../schemas/user.schema');

// Todas as rotas requerem autenticação e role admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /api/users/:
 *   get:
 *     tags: [Users]
 *     summary: Listar usuários do domínio
 *     description: Requer role admin. Retorna todos os usuários pertencentes ao mesmo domínio do admin autenticado.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso.
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
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
router.get('/', userController.getAll);

/**
 * @swagger
 * /api/users/{id}/access:
 *   put:
 *     tags: [Users]
 *     summary: Atualizar acesso de um usuário
 *     description: Requer role admin. Concede ou revoga o acesso (`hasAccess`) de um usuário do mesmo domínio. Não é permitido alterar o próprio acesso.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário a ter o acesso atualizado.
 *         example: 7
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hasAccess
 *             properties:
 *               hasAccess:
 *                 type: boolean
 *                 description: '`true` para conceder acesso, `false` para revogar.'
 *                 example: true
 *     responses:
 *       200:
 *         description: Acesso atualizado com sucesso.
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
 *                   example: Acesso concedido
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Tentativa de alterar o próprio acesso.
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
 *         description: Usuário não possui role admin ou o usuário-alvo pertence a outro domínio.
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
router.put('/:id/access', userController.updateAccess);

/**
 * @swagger
 * /api/users/{id}/role:
 *   put:
 *     tags: [Users]
 *     summary: Atualizar papel (role) de um usuário
 *     description: |
 *       Requer role admin. Promove um usuário para `admin` ou rebaixa de `admin` para `user`.
 *       Regras:
 *       - Não é permitido alterar o próprio papel.
 *       - Ao rebaixar um admin, o domínio deve ter pelo menos um outro admin.
 *       - Se o usuário rebaixado for o `admin_id` do domínio, a posse é transferida automaticamente para outro admin disponível.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário a ter o papel atualizado.
 *         example: 7
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleUpdateRequest'
 *     responses:
 *       200:
 *         description: Papel atualizado com sucesso.
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
 *                   example: Usuário promovido a administrador
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Tentativa de alterar o próprio papel ou domínio sem outro admin.
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
 *         description: Usuário não possui role admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuário não encontrado ou pertence a outro domínio.
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
router.put('/:id/role', validate(roleUpdateSchema), userController.updateRole);

/**
 * @swagger
 * /api/users/{id}/remove-from-domain:
 *   put:
 *     tags: [Users]
 *     summary: Remover usuário do domínio
 *     description: |
 *       Requer role admin. Remove um usuário do domínio do admin autenticado.
 *       O usuário removido fica sem domínio (órfão), perde todos os acessos a dispositivos
 *       e suas solicitações de acesso são excluídas.
 *       Não é permitido remover a si mesmo.
 *       Para remover um admin, o domínio deve ter pelo menos outro admin.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário a ser removido do domínio.
 *         example: 7
 *     responses:
 *       200:
 *         description: Usuário removido do domínio com sucesso.
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
 *                   example: Usuário removido do domínio com sucesso
 *       400:
 *         description: Tentativa de remover a si mesmo ou remover o único admin do domínio.
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
 *         description: Usuário não possui role admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuário não encontrado ou pertence a outro domínio.
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
router.put('/:id/remove-from-domain', userController.removeFromDomain);

module.exports = router;
