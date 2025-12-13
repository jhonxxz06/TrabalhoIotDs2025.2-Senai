// ============================================
// AUTH MIDDLEWARE (Supabase Auth)
// ============================================
const { supabase } = require('../config/supabase');
const Profile = require('../models/Profile');

/**
 * Middleware de autenticação Supabase JWT
 * Verifica se o token é válido e injeta req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verifica token via Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }

    // Busca profile do usuário
    const profile = await Profile.findById(user.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Perfil do usuário não encontrado'
      });
    }

    // Injeta os dados do usuário na requisição
    req.user = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      role: profile.role,
      has_access: profile.has_access
    };

    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
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
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        const profile = await Profile.findById(user.id);
        
        if (profile) {
          req.user = {
            id: profile.id,
            email: profile.email,
            username: profile.username,
            role: profile.role,
            has_access: profile.has_access
          };
        }
      }
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
