const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Gera um token JWT
 * @param {Object} payload - Dados a serem incluídos no token
 * @returns {string} Token JWT
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Verifica e decodifica um token JWT
 * @param {string} token - Token JWT
 * @returns {Object} Payload decodificado
 * @throws {Error} Se o token for inválido ou expirado
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw error;
  }
}

/**
 * Extrai o token do header Authorization
 * @param {string} authHeader - Header Authorization (Bearer <token>)
 * @returns {string|null} Token ou null se não encontrado
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer '
}

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader
};
