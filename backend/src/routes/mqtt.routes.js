const express = require('express');
const router = express.Router();
const mqttController = require('../controllers/mqtt.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/mqtt/status - Status das conexões MQTT
router.get('/status', mqttController.getStatus);

// POST /api/mqtt/connect-all - Conecta todos dispositivos (admin)
router.post('/connect-all', requireAdmin, mqttController.connectAll);

// POST /api/mqtt/:id/connect - Conecta dispositivo específico (admin)
router.post('/:id/connect', requireAdmin, mqttController.connect);

// POST /api/mqtt/:id/disconnect - Desconecta dispositivo (admin)
router.post('/:id/disconnect', requireAdmin, mqttController.disconnect);

// GET /api/mqtt/:id/data - Dados históricos
router.get('/:id/data', mqttController.getData);

// GET /api/mqtt/:id/latest - Último dado
router.get('/:id/latest', mqttController.getLatest);

// GET /api/mqtt/:id/exceedances - Excedências (alertas de thresholds)
router.get('/:id/exceedances', mqttController.getExceedances);

module.exports = router;
