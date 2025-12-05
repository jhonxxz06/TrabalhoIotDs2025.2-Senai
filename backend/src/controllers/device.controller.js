const Device = require('../models/Device');

/**
 * Lista dispositivos públicos (para tela de cadastro - sem autenticação)
 * Retorna apenas id e nome
 */
const getPublicList = (req, res) => {
  try {
    const devices = Device.findAll();
    
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
const getAll = (req, res) => {
  try {
    let devices;
    
    if (req.user.role === 'admin') {
      devices = Device.findAll();
    } else {
      devices = Device.findByUserId(req.user.id);
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
const getById = (req, res) => {
  try {
    const { id } = req.params;
    const device = Device.findById(id);

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
      devicePublic.assignedUsers = Device.getAssignedUsers(id);
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
const create = (req, res) => {
  try {
    const { name, mqttBroker, mqttPort, mqttTopic, mqttUsername, mqttPassword, assignedUsers } = req.body;

    const device = Device.create({
      name,
      mqttBroker,
      mqttPort,
      mqttTopic,
      mqttUsername,
      mqttPassword
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
const update = (req, res) => {
  try {
    const { id } = req.params;
    const device = Device.findById(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    const { name, mqttBroker, mqttPort, mqttTopic, mqttUsername, mqttPassword, assignedUsers } = req.body;

    const updatedDevice = Device.update(id, {
      name,
      mqttBroker,
      mqttPort,
      mqttTopic,
      mqttUsername,
      mqttPassword
    });

    // Atualiza usuários se informados
    if (assignedUsers !== undefined) {
      Device.setAssignedUsers(id, assignedUsers);
    }

    const devicePublic = Device.toPublic(updatedDevice);
    devicePublic.assignedUsers = Device.getAssignedUsers(id);

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
const remove = (req, res) => {
  try {
    const { id } = req.params;
    const device = Device.findById(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    Device.delete(id);

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
const updateUsers = (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    const device = Device.findById(id);

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

    const assignedUsers = Device.setAssignedUsers(id, userIds);

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
