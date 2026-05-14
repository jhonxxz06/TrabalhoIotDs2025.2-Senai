const MqttService = require('../services/mqtt.service');
const Device = require('../models/Device');

/**
 * Inicializa conexões MQTT para todos os dispositivos
 * @param {Object} io - Instância do Socket.IO
 */
async function initMqttConnections(io) {
  console.log('\n📡 Inicializando conexões MQTT...');
  
  // Configura Socket.IO no MQTT Service para emissão em tempo real
  if (io) {
    MqttService.setSocketIO(io);
  }
  
  try {
    const devices = await Device.findAll();
    
    if (!devices || devices.length === 0) {
      console.log('⚠️ Nenhum dispositivo encontrado para conectar');
      return;
    }

    devices.forEach(device => {
      // Só conecta se tiver broker e tópico configurados
      if (device.mqtt_broker && device.mqtt_topic) {
        try {
          MqttService.connect(device);
          console.log(`✅ Device ${device.id} (${device.name}) conectado`);
        } catch (error) {
          console.error(`❌ Erro ao conectar device ${device.id}:`, error.message);
        }
      } else {
        console.log(`⚠️ Device ${device.id} (${device.name}) sem configuração MQTT`);
      }
    });

    console.log('📡 Inicialização MQTT concluída\n');
  } catch (error) {
    console.error('❌ Erro ao inicializar MQTT:', error);
  }
}

module.exports = { initMqttConnections };
