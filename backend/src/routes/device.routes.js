const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createDeviceSchema, updateDeviceSchema } = require('../schemas/device.schema');

// Rota pública - lista dispositivos disponíveis (para tela de cadastro)
router.get('/public', deviceController.getPublicList);

// Todas as rotas abaixo requerem autenticação
router.use(authenticate);

// GET /api/devices - Lista dispositivos (admin: todos, user: apenas seus)
router.get('/', deviceController.getAll);

// GET /api/devices/:id - Busca dispositivo por ID
router.get('/:id', deviceController.getById);

// POST /api/devices - Cria dispositivo (admin)
router.post('/', requireAdmin, validate(createDeviceSchema), deviceController.create);

// PUT /api/devices/:id - Atualiza dispositivo (admin)
router.put('/:id', requireAdmin, validate(updateDeviceSchema), deviceController.update);

// DELETE /api/devices/:id - Remove dispositivo (admin)
router.delete('/:id', requireAdmin, deviceController.remove);

// PUT /api/devices/:id/users - Atualiza usuários do dispositivo (admin)
router.put('/:id/users', requireAdmin, deviceController.updateUsers);

module.exports = router;