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

// GET /api/users - Lista todos os usuários
router.get('/', userController.getAll);

// PUT /api/users/:id/access - Atualiza acesso do usuário
router.put('/:id/access', userController.updateAccess);

// PUT /api/users/:id/role - Promove/rebaixa um usuário do mesmo domínio
router.put('/:id/role', validate(roleUpdateSchema), userController.updateRole);

// PUT /api/users/:id/remove-from-domain - Remove um usuário do domínio
router.put('/:id/remove-from-domain', userController.removeFromDomain);

module.exports = router;
