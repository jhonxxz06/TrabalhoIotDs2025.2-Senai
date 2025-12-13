const Widget = require('../models/Widget');
const Device = require('../models/Device');

/**
 * Lista widgets (admin: todos, user: apenas dos seus dispositivos)
 */
const getAll = async (req, res) => {
  try {
    let widgets;
    
    if (req.user.role === 'admin') {
      widgets = await Widget.findAll();
    } else {
      widgets = await Widget.findByUserId(req.user.id);
    }

    res.json({
      success: true,
      widgets: widgets.map(Widget.toPublic)
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

    // Verifica acesso se não for admin
    if (req.user.role !== 'admin' && !(await Device.userHasAccess(deviceId, req.user.id))) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este dispositivo'
      });
    }

    const widgets = await Widget.findByDeviceId(deviceId);

    res.json({
      success: true,
      widgets: widgets.map(Widget.toPublic)
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

    // Verifica acesso via dispositivo se não for admin
    if (req.user.role !== 'admin' && !(await Device.userHasAccess(widget.device_id, req.user.id))) {
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

    const { name, type, deviceId, config, position } = req.body;

    // Se mudar deviceId, verifica se existe
    if (deviceId && !(await Device.findById(deviceId))) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }

    const updatedWidget = await Widget.update(id, {
      name,
      type,
      deviceId,
      config,
      position
    });

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

    await Widget.delete(id);

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
