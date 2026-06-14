const Device = require('../models/Device');
const User = require('../models/User');
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
      message: 'Dispositivos públicos listados com sucesso',
      data: devices.map(d => ({
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
 * Lista todos os dispositivos:
 * - Admin de domínio: vê apenas os do seu domínio
 * - Usuário comum: vê apenas os que tem acesso via device_users
 */
const getAll = async (req, res) => {
  try {
    let devices;

    if (req.user.role === 'admin') {
      // Admin de domínio: busca o usuário para pegar domain_id
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.domain_id) {
        devices = await Device.findByDomainId(dbUser.domain_id);
      } else {
        // Admin sem domínio associado: nenhum dispositivo é retornado
        // (evita acesso global a dados de outros domínios)
        devices = [];
      }
    } else {
      devices = await Device.findByUserId(req.user.id);
    }

    res.json({
      success: true,
      message: 'Dispositivos listados com sucesso',
      data: devices.map(Device.toPublic)
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
    if (req.user.role !== 'admin' && !Device.userHasAccess(id, req.user.id)) {
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
 * O device herda automaticamente o domain_id do admin que o criou.
 */
const create = async (req, res) => {
  try {
    const { name, mqttBroker, mqttPort, mqttTopic, mqttUsername, mqttPassword, assignedUsers } = req.body;

    // Recupera o domínio do admin criador
    const dbUser = await User.findById(req.user.id);
    const domain_id = dbUser?.domain_id ?? null;

    const device = await Device.create({
      name,
      mqttBroker,
      mqttPort,
      mqttTopic,
      mqttUsername,
      mqttPassword,
      domain_id
    });

    if (!device) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar dispositivo'
      });
    }

    // Atribui usuários se informados
    if (assignedUsers && assignedUsers.length > 0) {
      Device.setAssignedUsers(device.id, assignedUsers);
    }

    const devicePublic = Device.toPublic(device);
    devicePublic.assignedUsers = Device.getAssignedUsers(device.id);

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

    // Atualiza usuários se informados (MT-03)
    if (assignedUsers !== undefined) {
      // Calcula diff: apenas usuários recém-adicionados recebem has_access = true
      const previousUsers = await Device.getAssignedUsers(id);
      const previousUserIds = previousUsers.map(u => u.id);
      const newlyAddedIds = assignedUsers.filter(uid => !previousUserIds.includes(uid));

      await Device.setAssignedUsers(id, assignedUsers);

      for (const userId of newlyAddedIds) {
        await User.updateAccess(userId, true);
      }
    }

    const devicePublic = Device.toPublic(updatedDevice);
    devicePublic.assignedUsers = Device.getAssignedUsers(id);

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
      MqttService.disconnect(parseInt(id));
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

    // MT-02: Calcula diff — somente novos usuários recebem has_access = true
    const previousUsers = await Device.getAssignedUsers(id);
    const previousUserIds = previousUsers.map(u => u.id);
    const newlyAddedIds = userIds.filter(uid => !previousUserIds.includes(uid));

    const assignedUsers = await Device.setAssignedUsers(id, userIds);

    // MT-01: Ativa has_access para quem acabou de receber acesso ao device
    for (const userId of newlyAddedIds) {
      await User.updateAccess(userId, true);
    }

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
