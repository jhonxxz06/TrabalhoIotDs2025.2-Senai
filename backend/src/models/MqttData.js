// ============================================
// MODEL: MQTT_DATA (Supabase)
// ============================================
const { supabase } = require('../config/supabase');

const MqttData = {
  /**
   * Cria novo registro de dados MQTT
   */
  async create(data) {
    const { deviceId, topic, payload, receivedAt } = data;

    const { data: mqttData, error } = await supabase
      .from('mqtt_data')
      .insert({
        device_id: deviceId,
        topic,
        payload, // JSONB aceita objeto direto
        received_at: receivedAt || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return mqttData;
  },

  /**
   * Busca dados MQTT de um device (últimos N registros)
   */
  async findByDeviceId(deviceId, limit = 20) {
    const { data, error } = await supabase
      .from('mqtt_data')
      .select('*')
      .eq('device_id', deviceId)
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Busca dados MQTT recentes (últimos X minutos)
   */
  async findRecent(deviceId, minutes = 60) {
    const since = new Date();
    since.setMinutes(since.getMinutes() - minutes);

    const { data, error } = await supabase
      .from('mqtt_data')
      .select('*')
      .eq('device_id', deviceId)
      .gte('received_at', since.toISOString())
      .order('received_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Deleta dados antigos (limpeza periódica)
   */
  async deleteOld(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { error } = await supabase
      .from('mqtt_data')
      .delete()
      .lt('received_at', cutoffDate.toISOString());

    if (error) throw error;
    return true;
  },

  /**
   * Converte para formato público
   */
  toPublic(mqttData) {
    if (!mqttData) return null;
    return {
      id: mqttData.id,
      deviceId: mqttData.device_id,
      topic: mqttData.topic,
      payload: mqttData.payload, // Já vem como objeto (JSONB)
      receivedAt: mqttData.received_at,
      timestamp: mqttData.received_at // Alias para compatibilidade
    };
  }
};

module.exports = MqttData;
