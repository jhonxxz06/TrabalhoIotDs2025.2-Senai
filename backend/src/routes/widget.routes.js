const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widget.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createWidgetSchema, updateWidgetSchema } = require('../schemas/widget.schema');

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/widgets - Lista widgets (admin: todos, user: apenas dos seus dispositivos)
router.get('/', widgetController.getAll);

// GET /api/widgets/device/:deviceId - Lista widgets de um dispositivo
router.get('/device/:deviceId', widgetController.getByDevice);

// GET /api/widgets/:id - Busca widget por ID
router.get('/:id', widgetController.getById);

// POST /api/widgets - Cria widget (admin)
router.post('/', requireAdmin, validate(createWidgetSchema), widgetController.create);

// PUT /api/widgets/:id - Atualiza widget (admin)
router.put('/:id', requireAdmin, validate(updateWidgetSchema), widgetController.update);

// DELETE /api/widgets/:id - Remove widget (admin)
router.delete('/:id', requireAdmin, widgetController.remove);

module.exports = router;
