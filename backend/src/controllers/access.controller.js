const AccessRequest = require('../models/AccessRequest');
const Profile = require('../models/Profile');
const Device = require('../models/Device');

/**
 * Lista solicitações (admin: todas, user: apenas suas)
 */
const getAll = async (req, res) => {
  try {
    const { status } = req.query;
    let requests;

    if (req.user.role === 'admin') {
      requests = await AccessRequest.findAll(status);
    } else {
      requests = await AccessRequest.findByUserId(req.user.id);
    }

    res.json({
      success: true,
      requests: requests.map(AccessRequest.toPublic)
    });
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Conta solicitações pendentes (para badge de notificação)
 */
const countPending = async (req, res) => {
  try {
    const count = await AccessRequest.countPending();
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Erro ao contar solicitações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Cria solicitação de acesso (user sem acesso)
 */
const create = async (req, res) => {
  try {
    const { deviceId, message } = req.body;
    const userId = req.user.id;

    // Se não especificou deviceId, é uma solicitação geral
    // Verifica se usuário já tem acesso geral apenas nesse caso
    if (!deviceId) {
      const profile = await Profile.findById(userId);
      if (profile && profile.has_access) {
        return res.status(400).json({
          success: false,
          message: 'Você já possui acesso ao sistema'
        });
      }
    }

    // Verifica se já tem solicitação pendente
    if (await AccessRequest.hasPendingRequest(userId, deviceId)) {
      return res.status(400).json({
        success: false,
        message: 'Você já possui uma solicitação pendente'
      });
    }

    // Se especificou deviceId, verifica se dispositivo existe
    if (deviceId) {
      if (!(await Device.findById(deviceId))) {
        return res.status(404).json({
          success: false,
          message: 'Dispositivo não encontrado'
        });
      }
      
      // Verifica se usuário já tem acesso a este dispositivo específico
      if (await Device.userHasAccess(deviceId, userId)) {
        return res.status(400).json({
          success: false,
          message: 'Você já possui acesso a este dispositivo'
        });
      }
    }

    const request = await AccessRequest.create(userId, deviceId, message);

    res.status(201).json({
      success: true,
      message: 'Solicitação enviada com sucesso',
      request: AccessRequest.toPublic(request)
    });
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Aprova solicitação (admin)
 */
const approve = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await AccessRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitação já foi processada'
      });
    }

    // Aprova a solicitação
    await AccessRequest.approve(id, req.user.id);

    // Sempre dá has_access = true ao usuário quando aprovado
    await Profile.updateAccess(request.user_id, true);

    // Se for para dispositivo específico, adiciona acesso ao device também
    if (request.device_id) {
      const assignedUsers = await Device.getAssignedUsers(request.device_id);
      await Device.setAssignedUsers(request.device_id, [
        ...assignedUsers.map(u => u.id),
        request.user_id
      ]);
    }

    res.json({
      success: true,
      message: 'Solicitação aprovada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Rejeita solicitação (admin)
 */
const reject = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await AccessRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitação já foi processada'
      });
    }

    await AccessRequest.reject(id, req.user.id);

    res.json({
      success: true,
      message: 'Solicitação rejeitada'
    });
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  getAll,
  countPending,
  create,
  approve,
  reject
};
