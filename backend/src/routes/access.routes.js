const express = require('express');
const router = express.Router();
const accessController = require('../controllers/access.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/access - Lista solicitações (admin: todas, user: suas)
router.get('/', accessController.getAll);

// GET /api/access/pending/count - Conta pendentes (admin - para badge)
router.get('/pending/count', requireAdmin, accessController.countPending);

// POST /api/access - Cria solicitação (user)
router.post('/', accessController.create);

// PUT /api/access/:id/approve - Aprova solicitação (admin)
router.put('/:id/approve', requireAdmin, accessController.approve);

// PUT /api/access/:id/reject - Rejeita solicitação (admin)
router.put('/:id/reject', requireAdmin, accessController.reject);

module.exports = router;
