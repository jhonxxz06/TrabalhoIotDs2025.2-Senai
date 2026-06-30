const Widget = require('../models/Widget');
const Device = require('../models/Device');
const User = require('../models/User');
const notificationService = require('../services/notification.service');

/**
 * Lista widgets (admin: apenas do seu domínio, user: apenas dos seus dispositivos)
 */
const getAll = async (req, res) => {
  try {
    let widgets;

    if (req.user.role === 'admin') {
      const dbUser = await User.findById(req.user.id);
      widgets = dbUser?.domain_id
        ? await Widget.findByDomainId(dbUser.domain_id)
        : [];
    } else {
      widgets = await Widget.findByUserId(req.user.id);
    }

    res.json({
      success: true,
      message: 'Widgets listados com sucesso',
      data: widgets.map(Widget.toPublic)
    });
  } catch (error) {
    console.error('Erro ao listar widgets:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Busca widgets por dispositivo
 */
const getByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Verifica se dispositivo existe
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    // Garante que o dispositivo pertence ao mesmo domínio do usuário autenticado
    const dbUser = await User.findById(req.user.id);
    if (device.domain_id !== dbUser?.domain_id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este dispositivo'
      });
    }

    // Verifica acesso se não for admin
    if (req.user.role !== 'admin' && !await Device.userHasAccess(deviceId, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este dispositivo'
      });
    }

    const widgets = await Widget.findByDeviceId(deviceId);

    res.json({
      success: true,
      message: 'Widgets do dispositivo listados com sucesso',
      data: widgets.map(Widget.toPublic)
    });
  } catch (error) {
    console.error('Erro ao listar widgets do dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Busca widget por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const widget = await Widget.findById(id);

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget não encontrado'
      });
    }

    // Garante que o widget pertence a um dispositivo do mesmo domínio do usuário autenticado
    const device = await Device.findById(widget.device_id);
    const dbUser = await User.findById(req.user.id);
    if (!device || device.domain_id !== dbUser?.domain_id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este widget'
      });
    }

    // Verifica acesso via dispositivo se não for admin
    if (req.user.role !== 'admin' && !await Device.userHasAccess(widget.device_id, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este widget'
      });
    }

    res.json({
      success: true,
      widget: Widget.toPublic(widget)
    });
  } catch (error) {
    console.error('Erro ao buscar widget:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Cria um novo widget (admin)
 */
const create = async (req, res) => {
  try {
    const { name, type, deviceId, config, position } = req.body;

    // Verifica se dispositivo existe
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    // Garante que o dispositivo pertence ao mesmo domínio do usuário autenticado
    const dbUser = await User.findById(req.user.id);
    if (device.domain_id !== dbUser?.domain_id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este dispositivo'
      });
    }

    const widget = await Widget.create({
      name,
      type,
      deviceId,
      config,
      position
    });

    if (!widget) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar widget'
      });
    }

    notificationService.refreshWidgetCache(deviceId);

    res.status(201).json({
      success: true,
      message: 'Widget criado com sucesso',
      widget: Widget.toPublic(widget)
    });
  } catch (error) {
    console.error('Erro ao criar widget:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Atualiza um widget (admin)
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const widget = await Widget.findById(id);

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget não encontrado'
      });
    }

    // Garante que o widget pertence a um dispositivo do mesmo domínio do usuário autenticado
    const dbUser = await User.findById(req.user.id);
    const currentDevice = await Device.findById(widget.device_id);
    if (!currentDevice || currentDevice.domain_id !== dbUser?.domain_id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este widget'
      });
    }

    const { name, type, deviceId, config, position } = req.body;

    // Se mudar deviceId, verifica se existe e pertence ao mesmo domínio
    if (deviceId) {
      const newDevice = await Device.findById(deviceId);
      if (!newDevice) {
        return res.status(404).json({
          success: false,
          message: 'Dispositivo não encontrado'
        });
      }
      if (newDevice.domain_id !== dbUser?.domain_id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado a este dispositivo'
        });
      }
    }

    const updatedWidget = await Widget.update(id, {
      name,
      type,
      deviceId,
      config,
      position
    });

    // Reset contadores de notificação quando config muda
    if (config !== undefined) {
      notificationService.resetCounters(id);
    }
    notificationService.refreshWidgetCache(updatedWidget.device_id);

    res.json({
      success: true,
      message: 'Widget atualizado com sucesso',
      widget: Widget.toPublic(updatedWidget)
    });
  } catch (error) {
    console.error('Erro ao atualizar widget:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Remove um widget (admin)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const widget = await Widget.findById(id);

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget não encontrado'
      });
    }

    // Garante que o widget pertence a um dispositivo do mesmo domínio do usuário autenticado
    const dbUser = await User.findById(req.user.id);
    const device = await Device.findById(widget.device_id);
    if (!device || device.domain_id !== dbUser?.domain_id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este widget'
      });
    }

    await Widget.delete(id);

    notificationService.resetCounters(id);
    notificationService.refreshWidgetCache(widget.device_id);

    res.json({
      success: true,
      message: 'Widget removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover widget:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  getAll,
  getByDevice,
  getById,
  create,
  update,
  remove
};
