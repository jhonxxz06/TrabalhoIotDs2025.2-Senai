const User = require('../models/User');

/**
 * Middleware RBAC (Role-Based Access Control)
 * Verifica o role real do banco — não confia apenas no JWT, que pode estar desatualizado.
 * @param {string[]} allowedRoles - Array de roles permitidas
 */
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ success: false, error: 'Acesso não autorizado' });
      }
      req.user.role = user.role;
      next();
    } catch {
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  };
};

/**
 * Middleware que requer role de admin
 */
const requireAdmin = requireRole(['admin']);

/**
 * Middleware que requer role de user ou admin
 */
const requireUser = requireRole(['user', 'admin']);

module.exports = {
  requireRole,
  requireAdmin,
  requireUser
};
