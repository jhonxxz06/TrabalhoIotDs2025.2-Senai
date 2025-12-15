/**
 * Middleware RBAC (Role-Based Access Control)
 * Verifica se o usuário tem a role necessária
 * @param {string[]} allowedRoles - Array de roles permitidas
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Verifica se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado'
      });
    }

    // Verifica se a role do usuário está na lista de permitidas
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso não autorizado'
      });
    }

    next();
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
