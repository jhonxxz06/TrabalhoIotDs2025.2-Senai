const AccessRequest = require('../models/AccessRequest');
const User = require('../models/User');
const Device = require('../models/Device');

/**
 * Lista solicitações (admin: do seu domínio, user: apenas suas)
 */
const getAll = async (req, res) => {
  try {
    const { status } = req.query;
    let requests;

    if (req.user.role === 'admin') {
      const dbUser = await User.findById(req.user.id);
      requests = dbUser?.domain_id
        ? await AccessRequest.findByDomainId(dbUser.domain_id, status)
        : [];
    } else {
      // Usuário comum pode filtrar suas próprias solicitações por status
      requests = await AccessRequest.findByUserId(req.user.id, status);
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
 * Conta solicitações pendentes do domínio do admin (para badge de notificação)
 */
const countPending = async (req, res) => {
  try {
    const dbUser = await User.findById(req.user.id);
    const count = dbUser?.domain_id
      ? await AccessRequest.countPendingByDomainId(dbUser.domain_id)
      : 0;
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
      const user = await User.findById(userId);
      if (user && user.has_access) {
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
      if (!await Device.findById(deviceId)) {
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
 * Aprova solicitação (admin do mesmo domínio do solicitante)
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

    // Garante que a solicitação pertence ao domínio do admin autenticado
    const dbAdmin = await User.findById(req.user.id);
    if (!dbAdmin?.domain_id || request.user_domain_id !== dbAdmin.domain_id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta solicitação'
      });
    }

    // Se for para dispositivo específico, garante que o device pertence ao mesmo domínio
    if (request.device_id) {
      const device = await Device.findById(request.device_id);
      if (!device || device.domain_id !== dbAdmin.domain_id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado a este dispositivo'
        });
      }
    }

    // Aprova a solicitação
    await AccessRequest.approve(id);

    // Sempre dá has_access = true ao usuário quando aprovado
    await User.updateAccess(request.user_id, true);

    // Se for para dispositivo específico, adiciona acesso ao device
    if (request.device_id) {
      const currentUsers = await Device.getAssignedUsers(request.device_id);
      await Device.setAssignedUsers(request.device_id, [
        ...currentUsers.map(u => u.id),
        request.user_id
      ]);
    } else {
      // Se for uma solicitação geral (device_id = null), adiciona a todos os dispositivos do domínio do admin
      const domainDevices = await Device.findByDomainId(dbAdmin.domain_id);
      for (const device of domainDevices) {
        const hasAccess = await Device.userHasAccess(device.id, request.user_id);
        if (!hasAccess) {
          const currentUsers = await Device.getAssignedUsers(device.id);
          await Device.setAssignedUsers(device.id, [
            ...currentUsers.map(u => u.id),
            request.user_id
          ]);
        }
      }
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
 * Rejeita solicitação (admin do mesmo domínio do solicitante)
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

    // Garante que a solicitação pertence ao domínio do admin autenticado
    const dbAdmin = await User.findById(req.user.id);
    if (!dbAdmin?.domain_id || request.user_domain_id !== dbAdmin.domain_id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta solicitação'
      });
    }

    await AccessRequest.reject(id);

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
