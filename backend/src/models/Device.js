// ============================================
// MODEL: DEVICE (Supabase)
// ============================================
const { supabase } = require('../config/supabase');

const Device = {
  /**
   * Busca dispositivo por UUID
   */
  async findById(id) {
    const { data, error } = await supabase
      .from('devices')
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
   * Lista todos os dispositivos
   */
  async findAll() {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Lista dispositivos de um usuário específico
   */
  async findByUserId(userId) {
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        device_users!inner(user_id)
      `)
      .eq('device_users.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Cria um novo dispositivo
   */
  async create(data) {
    const { 
      name, 
      mqttBroker, 
      mqttPort = 1883, 
      mqttTopic, 
      mqttUsername = null, 
      mqttPassword = null,
      ownerId = null
    } = data;

    const { data: device, error } = await supabase
      .from('devices')
      .insert({
        name,
        mqtt_broker: mqttBroker,
        mqtt_port: mqttPort,
        mqtt_topic: mqttTopic,
        mqtt_username: mqttUsername,
        mqtt_password: mqttPassword,
        owner_id: ownerId
      })
      .select()
      .single();

    if (error) throw error;
    return device;
  },

  /**
   * Atualiza um dispositivo
   */
  async update(id, data) {
    const updates = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.mqttBroker !== undefined) updates.mqtt_broker = data.mqttBroker;
    if (data.mqttPort !== undefined) updates.mqtt_port = data.mqttPort;
    if (data.mqttTopic !== undefined) updates.mqtt_topic = data.mqttTopic;
    if (data.mqttUsername !== undefined) updates.mqtt_username = data.mqttUsername;
    if (data.mqttPassword !== undefined) updates.mqtt_password = data.mqttPassword;

    if (Object.keys(updates).length === 0) {
      return this.findById(id);
    }

    const { data: device, error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return device;
  },

  /**
   * Remove um dispositivo
   */
  async delete(id) {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Retorna usuários atribuídos a um dispositivo
   */
  async getAssignedUsers(deviceId) {
    const { data, error } = await supabase
      .from('device_users')
      .select(`
        user_id,
        profiles:user_id (
          id,
          username,
          email,
          role
        )
      `)
      .eq('device_id', deviceId);

    if (error) throw error;
    
    // Flatten structure
    return (data || []).map(item => ({
      id: item.profiles.id,
      username: item.profiles.username,
      email: item.profiles.email,
      role: item.profiles.role
    }));
  },

  /**
   * Atribui usuários a um dispositivo
   */
  async setAssignedUsers(deviceId, userIds) {
    // Remove todos os usuários atuais
    const { error: deleteError } = await supabase
      .from('device_users')
      .delete()
      .eq('device_id', deviceId);

    if (deleteError) throw deleteError;

    // Adiciona os novos usuários
    if (userIds && userIds.length > 0) {
      const inserts = userIds.map(userId => ({
        device_id: deviceId,
        user_id: userId
      }));

      const { error: insertError } = await supabase
        .from('device_users')
        .insert(inserts);

      if (insertError) throw insertError;
    }

    return this.getAssignedUsers(deviceId);
  },

  /**
   * Verifica se um usuário tem acesso a um dispositivo
   */
  async userHasAccess(deviceId, userId) {
    const { data, error } = await supabase
      .from('device_users')
      .select('user_id')
      .eq('device_id', deviceId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  /**
   * Converte para formato público (camelCase)
   */
  toPublic(device) {
    if (!device) return null;
    return {
      id: device.id,
      name: device.name,
      mqttBroker: device.mqtt_broker,
      mqttPort: device.mqtt_port,
      mqttTopic: device.mqtt_topic,
      mqttUsername: device.mqtt_username,
      mqttPassword: device.mqtt_password,
      ownerId: device.owner_id,
      createdAt: device.created_at,
      updatedAt: device.updated_at
    };
  }
};

module.exports = Device;
