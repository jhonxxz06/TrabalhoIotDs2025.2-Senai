const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');

// Todas as rotas requerem autenticação e role admin
router.use(authenticate);
router.use(requireAdmin);

// GET /api/users - Lista todos os usuários
router.get('/', userController.getAll);

// PUT /api/users/:id/access - Atualiza acesso do usuário
router.put('/:id/access', userController.updateAccess);

module.exports = router;
