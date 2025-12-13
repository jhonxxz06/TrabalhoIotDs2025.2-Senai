const Device = require('../models/Device');
const Profile = require('../models/Profile');
const MqttService = require('../services/mqtt.service');

/**
 * Lista dispositivos públicos (para tela de cadastro - sem autenticação)
 * Retorna apenas id e nome
 */
const getPublicList = async (req, res) => {
  try {
    const devices = await Device.findAll();
    
    res.json({
      success: true,
      devices: devices.map(d => ({
        id: d.id,
        name: d.name
      }))
    });
  } catch (error) {
    console.error('Erro ao listar dispositivos públicos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Lista todos os dispositivos (admin) ou só os do usuário
 */
const getAll = async (req, res) => {
  try {
    let devices;
    
    if (req.user.role === 'admin') {
      devices = await Device.findAll();
    } else {
      devices = await Device.findByUserId(req.user.id);
    }

    res.json({
      success: true,
      devices: devices.map(Device.toPublic)
    });
  } catch (error) {
    console.error('Erro ao listar dispositivos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Busca um dispositivo por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findById(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    // Verifica acesso se não for admin
    if (req.user.role !== 'admin' && !(await Device.userHasAccess(id, req.user.id))) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este dispositivo'
      });
    }

    const devicePublic = Device.toPublic(device);
    
    // Admin pode ver usuários atribuídos
    if (req.user.role === 'admin') {
      devicePublic.assignedUsers = await Device.getAssignedUsers(id);
    }

    res.json({
      success: true,
      device: devicePublic
    });
  } catch (error) {
    console.error('Erro ao buscar dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Cria um novo dispositivo (apenas admin)
 */
const create = async (req, res) => {
  try {
    const { name, mqttBroker, mqttPort, mqttTopic, mqttUsername, mqttPassword, assignedUsers } = req.body;

    const device = await Device.create({
      name,
      mqttBroker,
      mqttPort,
      mqttTopic,
      mqttUsername,
      mqttPassword,
      ownerId: req.user.id
    });

    if (!device) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar dispositivo'
      });
    }

    // ✅ VALIDAÇÃO #3: Garantir que device tenha pelo menos 1 admin
    if (assignedUsers && assignedUsers.length > 0) {
      const hasAdminPromises = assignedUsers.map(async userId => {
        const profile = await Profile.findById(userId);
        return profile && profile.role === 'admin';
      });
      const adminChecks = await Promise.all(hasAdminPromises);
      const hasAdmin = adminChecks.some(isAdmin => isAdmin);

      if (!hasAdmin) {
        // Se não tem admin, adicionar o próprio usuário (que é admin)
        if (!assignedUsers.includes(req.user.id)) {
          assignedUsers.push(req.user.id);
        }
      }

      await Device.setAssignedUsers(device.id, assignedUsers);
    } else {
      // Se não informou usuários, atribuir o próprio admin criador
      await Device.setAssignedUsers(device.id, [req.user.id]);
    }

    const devicePublic = Device.toPublic(device);
    devicePublic.assignedUsers = await Device.getAssignedUsers(device.id);

    // Auto-conectar ao MQTT se tiver configuração
    if (device.mqtt_broker && device.mqtt_topic) {
      try {
        MqttService.connect(device);
        console.log(`✅ Device ${device.id} (${device.name}) auto-conectado ao MQTT`);
      } catch (error) {
        console.warn(`⚠️ Erro ao auto-conectar MQTT do device ${device.id}:`, error.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Dispositivo criado com sucesso',
      device: devicePublic
    });
  } catch (error) {
    console.error('Erro ao criar dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Atualiza um dispositivo (apenas admin)
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findById(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    const { name, mqttBroker, mqttPort, mqttTopic, mqttUsername, mqttPassword, assignedUsers } = req.body;

    const updatedDevice = await Device.update(id, {
      name,
      mqttBroker,
      mqttPort,
      mqttTopic,
      mqttUsername,
      mqttPassword
    });

    // ✅ VALIDAÇÃO #3: Atualiza usuários garantindo pelo menos 1 admin
    if (assignedUsers !== undefined) {
      if (assignedUsers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Device deve ter pelo menos um administrador atribuído'
        });
      }

      const hasAdminPromises = assignedUsers.map(async userId => {
        const profile = await Profile.findById(userId);
        return profile && profile.role === 'admin';
      });
      const adminChecks = await Promise.all(hasAdminPromises);
      const hasAdmin = adminChecks.some(isAdmin => isAdmin);

      if (!hasAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Pelo menos um administrador deve estar vinculado ao device'
        });
      }

      await Device.setAssignedUsers(id, assignedUsers);
    }

    const devicePublic = Device.toPublic(updatedDevice);
    devicePublic.assignedUsers = await Device.getAssignedUsers(id);

    // Reconectar ao MQTT se as configurações mudaram
    if (updatedDevice.mqtt_broker && updatedDevice.mqtt_topic) {
      try {
        MqttService.disconnect(parseInt(id));
        MqttService.connect(updatedDevice);
        console.log(`✅ Device ${id} (${updatedDevice.name}) reconectado ao MQTT`);
      } catch (error) {
        console.warn(`⚠️ Erro ao reconectar MQTT do device ${id}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: 'Dispositivo atualizado com sucesso',
      device: devicePublic
    });
  } catch (error) {
    console.error('Erro ao atualizar dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Remove um dispositivo (apenas admin)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findById(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    // Desconectar MQTT antes de excluir
    try {
      MqttService.disconnect(id);
      console.log(`✅ Device ${id} desconectado do MQTT antes da exclusão`);
    } catch (error) {
      console.warn(`⚠️ Erro ao desconectar MQTT:`, error.message);
    }

    await Device.delete(id);

    res.json({
      success: true,
      message: 'Dispositivo removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Atualiza apenas os usuários atribuídos (apenas admin)
 */
const updateUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    const device = await Device.findById(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    if (!Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'userIds deve ser um array'
      });
    }

    const assignedUsers = await Device.setAssignedUsers(id, userIds);

    res.json({
      success: true,
      message: 'Usuários atualizados com sucesso',
      assignedUsers
    });
  } catch (error) {
    console.error('Erro ao atualizar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  getPublicList,
  getAll,
  getById,
  create,
  update,
  remove,
  updateUsers
};
