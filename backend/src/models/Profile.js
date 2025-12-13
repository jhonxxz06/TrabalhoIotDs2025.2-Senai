// ============================================
// MODEL: PROFILE (Supabase)
// ============================================
// Substitui o antigo User.js para tabela profiles
// Profiles são extensão dos auth.users do Supabase

const { supabase } = require('../config/supabase');

const Profile = {
  /**
   * Busca profile por UUID
   */
  async findById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  /**
   * Busca profile por email
   */
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  /**
   * Lista todos os profiles
   */
  async findAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Atualiza profile (role, has_access, etc)
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Atualiza apenas has_access (aprovação de usuário)
   */
  async updateAccess(id, hasAccess) {
    return this.update(id, { has_access: hasAccess });
  },

  /**
   * Remove campos sensíveis para retorno público
   */
  toPublic(profile) {
    if (!profile) return null;
    
    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      has_access: profile.has_access,
      created_at: profile.created_at
    };
  }
};

module.exports = Profile;
