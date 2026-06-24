const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domain.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateTelegramSchema } = require('../schemas/domain.schema');

// ─── Rota pública ────────────────────────────────────────────────────────────
// Verifica se um código de domínio existe (usado na tela de cadastro)
router.get('/verify/:code', domainController.verify);

// ─── Rotas protegidas ────────────────────────────────────────────────────────
// Lista todos os domínios (apenas admin)
router.get('/', authenticate, domainController.getAll);

// Lista devices de um domínio específico
router.get('/:id/devices', authenticate, domainController.getDevices);

// Lista usuários de um domínio específico (usado no modal de edição de dispositivo)
router.get('/:id/users', authenticate, domainController.getUsers);

// Gerenciamento de plano SaaS (somente admin do domínio)
router.put('/:id/plan', authenticate, requireAdmin, domainController.updatePlan);

// Configuração de notificações via Telegram (admin)
router.get('/:id/telegram', authenticate, requireAdmin, domainController.getTelegramConfig);
router.put('/:id/telegram', authenticate, requireAdmin, validate(updateTelegramSchema), domainController.updateTelegramConfig);
router.post('/:id/telegram/generate-code', authenticate, requireAdmin, domainController.generateVerificationCode);

module.exports = router;
