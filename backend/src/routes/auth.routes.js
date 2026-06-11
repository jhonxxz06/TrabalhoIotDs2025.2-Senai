const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const {
  loginSchema,
  registerSchema,
  joinDomainSchema,
  createDomainSchema,
  leaveDomainSchema
} = require('../schemas/auth.schema');
const { authenticate } = require('../middleware/auth.middleware');

// Rotas públicas
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Rotas protegidas
router.get('/me', authenticate, authController.me);
router.put('/profile', authenticate, authController.updateProfile);
router.delete('/account', authenticate, authController.deleteAccount);
router.put('/leave-domain', authenticate, validate(leaveDomainSchema), authController.leaveDomain);
router.put('/join-domain', authenticate, validate(joinDomainSchema), authController.joinDomain);
router.put('/create-domain', authenticate, validate(createDomainSchema), authController.createDomain);

module.exports = router;
