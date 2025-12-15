const { verifyToken, extractTokenFromHeader } = require('../services/token.service');

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e injeta req.user
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      });
    }

    // Verifica e decodifica o token
    const decoded = verifyToken(token);
    
    // Injeta os dados do usuário na requisição
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
};

/**
 * Middleware opcional de autenticação
 * Não bloqueia se não tiver token, mas injeta req.user se tiver
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };
    }
  } catch (error) {
    // Ignora erros de token - é opcional
  }
  
  next();
};

module.exports = {
  authenticate,
  optionalAuth
};
