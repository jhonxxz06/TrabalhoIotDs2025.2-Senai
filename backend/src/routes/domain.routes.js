const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domain.controller');
const { authenticate } = require('../middleware/auth.middleware');

// ─── Rota pública ────────────────────────────────────────────────────────────
// Verifica se um código de domínio existe (usado na tela de cadastro)
router.get('/verify/:code', domainController.verify);

// ─── Rotas protegidas ────────────────────────────────────────────────────────
// Lista todos os domínios (apenas admin)
router.get('/', authenticate, domainController.getAll);

// Lista devices de um domínio específico
router.get('/:id/devices', authenticate, domainController.getDevices);

module.exports = router;
