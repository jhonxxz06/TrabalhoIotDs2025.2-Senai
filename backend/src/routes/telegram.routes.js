// Rota do webhook do Telegram — montada em /api/telegram (sem prefixo /api/domains)
// Não usa autenticação JWT; a segurança é feita via X-Telegram-Bot-Api-Secret-Token
const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domain.controller');

router.post('/webhook', domainController.handleTelegramWebhook);

module.exports = router;
