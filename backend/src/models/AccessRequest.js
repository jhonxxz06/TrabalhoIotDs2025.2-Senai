// ============================================
// MODEL: ACCESS_REQUEST (Supabase)
// ============================================
const { supabase } = require('../config/supabase');

const AccessRequest = {
  /**
   * Busca solicitação por UUID
   */
  async findById(id) {
    const { data, error } = await supabase
      .from('access_requests')
      .select(`
        *,
        profiles:user_id (username, email),
        devices:device_id (name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // Flatten structure
    return {
      ...data,
      username: data.profiles?.username,
      email: data.profiles?.email,
      device_name: data.devices?.name
    };
  },

  /**
   * Lista todas as solicitações (admin)
   */
  async findAll(status = null) {
    let query = supabase
      .from('access_requests')
      .select(`
        *,
        profiles:user_id (username, email),
        devices:device_id (name)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Flatten structure
    return (data || []).map(item => ({
      ...item,
      username: item.profiles?.username,
      email: item.profiles?.email,
      device_name: item.devices?.name
    }));
  },

  /**
   * Lista solicitações de um usuário
   */
  async findByUserId(userId) {
    const { data, error } = await supabase
      .from('access_requests')
      .select(`
        *,
        devices:device_id (name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      device_name: item.devices?.name
    }));
  },

  /**
   * Conta solicitações pendentes (para notificação do admin)
   */
  async countPending() {
    const { count, error } = await supabase
      .from('access_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  },

  /**
   * Verifica se usuário já tem solicitação pendente
   */
  async hasPendingRequest(userId, deviceId = null) {
    let query = supabase
      .from('access_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else {
      query = query.is('device_id', null);
    }

    const { data, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  /**
   * Cria nova solicitação de acesso
   */
  async create(userId, deviceId = null, message = null) {
    const { data, error } = await supabase
      .from('access_requests')
      .insert({
        user_id: userId,
        device_id: deviceId,
        message,
        status: 'pending'
      })
      .select(`
        *,
        profiles:user_id (username, email),
        devices:device_id (name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      username: data.profiles?.username,
      email: data.profiles?.email,
      device_name: data.devices?.name
    };
  },

  /**
   * Atualiza status da solicitação
   */
  async updateStatus(id, status, reviewedBy = null) {
    const updates = {
      status,
      reviewed_at: new Date().toISOString()
    };

    if (reviewedBy) {
      updates.reviewed_by = reviewedBy;
    }

    const { data, error } = await supabase
      .from('access_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.findById(id);
  },

  /**
   * Aprova solicitação
   */
  async approve(id, reviewedBy = null) {
    return this.updateStatus(id, 'approved', reviewedBy);
  },

  /**
   * Rejeita solicitação
   */
  async reject(id, reviewedBy = null) {
    return this.updateStatus(id, 'rejected', reviewedBy);
  },

  /**
   * Remove solicitação
   */
  async delete(id) {
    const { error } = await supabase
      .from('access_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Converte para formato público
   */
  toPublic(request) {
    if (!request) return null;
    return {
      id: request.id,
      userId: request.user_id,
      username: request.username,
      email: request.email,
      deviceId: request.device_id,
      deviceName: request.device_name,
      message: request.message,
      status: request.status,
      reviewedBy: request.reviewed_by,
      reviewedAt: request.reviewed_at,
      createdAt: request.created_at,
      updatedAt: request.updated_at
    };
  }
};

module.exports = AccessRequest;
