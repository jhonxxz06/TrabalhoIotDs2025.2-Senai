const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const { loginSchema, registerSchema } = require('../schemas/auth.schema');
const { authenticate } = require('../middleware/auth.middleware');

// Rotas públicas
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Rotas protegidas
router.get('/me', authenticate, authController.me);

module.exports = router;
