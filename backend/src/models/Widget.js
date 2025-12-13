// ============================================
// MODEL: WIDGET (Supabase)
// ============================================
const { supabase } = require('../config/supabase');

const Widget = {
  /**
   * Busca widget por UUID
   */
  async findById(id) {
    const { data, error } = await supabase
      .from('widgets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /**
   * Lista todos os widgets
   */
  async findAll() {
    const { data, error } = await supabase
      .from('widgets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Lista widgets de um dispositivo
   */
  async findByDeviceId(deviceId) {
    const { data, error } = await supabase
      .from('widgets')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Lista widgets acessíveis por um usuário (via dispositivos atribuídos)
   */
  async findByUserId(userId) {
    const { data, error } = await supabase
      .from('widgets')
      .select(`
        *,
        devices!inner(
          id,
          device_users!inner(user_id)
        )
      `)
      .eq('devices.device_users.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Cria um novo widget
   */
  async create(data) {
    const { name, type, deviceId, config = {}, position = {} } = data;

    const { data: widget, error } = await supabase
      .from('widgets')
      .insert({
        name,
        type,
        device_id: deviceId,
        config, // Supabase aceita JSON direto (JSONB)
        position
      })
      .select()
      .single();

    if (error) throw error;
    return widget;
  },

  /**
   * Atualiza um widget
   */
  async update(id, data) {
    const updates = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.type !== undefined) updates.type = data.type;
    if (data.deviceId !== undefined) updates.device_id = data.deviceId;
    if (data.config !== undefined) updates.config = data.config;
    if (data.position !== undefined) updates.position = data.position;

    if (Object.keys(updates).length === 0) {
      return this.findById(id);
    }

    const { data: widget, error } = await supabase
      .from('widgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return widget;
  },

  /**
   * Remove um widget
   */
  async delete(id) {
    const { error } = await supabase
      .from('widgets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Converte para formato público (camelCase)
   */
  toPublic(widget) {
    if (!widget) return null;
    return {
      id: widget.id,
      name: widget.name,
      type: widget.type,
      deviceId: widget.device_id,
      config: widget.config, // Já vem como objeto (JSONB)
      position: widget.position, // Já vem como objeto (JSONB)
      createdAt: widget.created_at,
      updatedAt: widget.updated_at
    };
  }
};

module.exports = Widget;
