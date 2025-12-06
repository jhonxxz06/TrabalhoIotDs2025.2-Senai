const MqttService = require('../services/mqtt.service');
const Device = require('../models/Device');

/**
 * Conecta a um dispositivo MQTT
 */
const connect = (req, res) => {
  try {
    const { id } = req.params;
    const device = Device.findById(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    MqttService.connect(device);

    res.json({
      success: true,
      message: `Conectando ao dispositivo ${device.name}...`
    });
  } catch (error) {
    console.error('Erro ao conectar MQTT:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Desconecta de um dispositivo MQTT
 */
const disconnect = (req, res) => {
  try {
    const { id } = req.params;
    MqttService.disconnect(parseInt(id));

    res.json({
      success: true,
      message: 'Dispositivo desconectado'
    });
  } catch (error) {
    console.error('Erro ao desconectar MQTT:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Retorna status das conexões MQTT
 */
const getStatus = (req, res) => {
  try {
    const status = MqttService.getStatus();
    res.json({
      success: true,
      connections: status
    });
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Busca dados históricos de um dispositivo
 */
const getData = (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, period } = req.query;

    // Verifica acesso
    if (req.user.role !== 'admin' && !Device.userHasAccess(id, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este dispositivo'
      });
    }

    let data;
    if (period === 'day') {
      data = MqttService.getDayData(id);
    } else if (period === 'week') {
      data = MqttService.getWeekData(id);
    } else {
      data = MqttService.getData(id, { limit: parseInt(limit) });
    }

    // Parse do payload JSON se possível
    const parsedData = data.map(item => {
      try {
        return {
          id: item.id,
          deviceId: item.device_id,
          topic: item.topic,
          payload: JSON.parse(item.payload),
          receivedAt: item.received_at
        };
      } catch {
        return {
          id: item.id,
          deviceId: item.device_id,
          topic: item.topic,
          payload: item.payload,
          receivedAt: item.received_at
        };
      }
    });

    res.json({
      success: true,
      count: parsedData.length,
      data: parsedData
    });
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Busca último dado de um dispositivo
 */
const getLatest = (req, res) => {
  try {
    const { id } = req.params;

    // Verifica acesso
    if (req.user.role !== 'admin' && !Device.userHasAccess(id, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este dispositivo'
      });
    }

    const device = Device.findById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    // Tenta do cache primeiro, senão do banco
    let data = MqttService.getLatest(device.mqtt_topic);
    
    if (!data) {
      const dbData = MqttService.getLatestFromDb(id);
      if (dbData) {
        data = {
          payload: dbData.payload,
          timestamp: dbData.received_at
        };
      }
    }

    if (!data) {
      return res.json({
        success: true,
        data: null,
        message: 'Nenhum dado disponível'
      });
    }

    // Parse do payload
    let payload;
    try {
      payload = JSON.parse(data.payload);
    } catch {
      payload = data.payload;
    }

    res.json({
      success: true,
      data: {
        payload,
        timestamp: data.timestamp
      }
    });
  } catch (error) {
    console.error('Erro ao buscar último dado:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Conecta todos os dispositivos (chamado no startup)
 */
const connectAll = (req, res) => {
  try {
    const devices = Device.findAll();
    let connected = 0;

    for (const device of devices) {
      MqttService.connect(device);
      connected++;
    }

    res.json({
      success: true,
      message: `${connected} dispositivo(s) sendo conectado(s)`
    });
  } catch (error) {
    console.error('Erro ao conectar dispositivos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Busca excedências (valores fora dos thresholds)
 */
const getExceedances = (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, since } = req.query;

    // Verifica acesso
    if (req.user.role !== 'admin' && !Device.userHasAccess(id, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este dispositivo'
      });
    }

    // Thresholds vêm como query params (field1Min, field1Max, field2Min, field2Max, etc.)
    // Exemplo: ?temperatureMin=15&temperatureMax=30&humidityMin=40&humidityMax=80
    const thresholds = {};
    
    // Extrair thresholds dos query params
    Object.keys(req.query).forEach(key => {
      if (key.endsWith('Min') || key.endsWith('Max')) {
        const field = key.replace(/Min$/, '').replace(/Max$/, '');
        const type = key.endsWith('Min') ? 'min' : 'max';
        
        if (!thresholds[field]) {
          thresholds[field] = {};
        }
        
        thresholds[field][type] = req.query[key];
      }
    });

    const options = {
      limit: parseInt(limit),
      since: since || null
    };

    const data = MqttService.getExceedances(parseInt(id), thresholds, options);

    console.log('[Controller] Dados do service:', data.length, 'registros');

    // Parse do payload se necessário
    const parsedData = data.map(item => {
      try {
        return {
          ...item,
          payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload
        };
      } catch {
        return item;
      }
    });

    console.log('[Controller] Dados parseados:', parsedData.length, 'registros');
    console.log('[Controller] Primeiro item:', JSON.stringify(parsedData[0], null, 2));

    res.json({
      success: true,
      data: parsedData,
      count: parsedData.length,
      thresholds
    });
  } catch (error) {
    console.error('Erro ao buscar excedências:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  connect,
  disconnect,
  getStatus,
  getData,
  getLatest,
  connectAll,
  getExceedances
};
