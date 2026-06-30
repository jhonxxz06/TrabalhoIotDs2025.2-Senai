jest.mock('../../../models/Device');
jest.mock('../../../models/User');
jest.mock('../../../models/Domain');
jest.mock('../../../services/mqtt.service');

const Device = require('../../../models/Device');
const User = require('../../../models/User');
const Domain = require('../../../models/Domain');
const MqttService = require('../../../services/mqtt.service');
const deviceController = require('../../../controllers/device.controller');
const { mockReq, mockRes } = require('../../helpers/mockReqRes');
const { createUser, createDevice, createDomain } = require('../../helpers/factories');

beforeEach(() => {
  Device.toPublic.mockImplementation(device => {
    if (!device) return null;
    return {
      id: device.id,
      name: device.name,
      mqttBroker: device.mqtt_broker,
      mqttPort: device.mqtt_port,
      mqttTopic: device.mqtt_topic,
      domainId: device.domain_id ?? null
    };
  });
});

describe('getAll', () => {
  it('admin: deve chamar Device.findByDomainId e retornar todos os devices do domínio', async () => {
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: 1 }));
    const devices = [createDevice({ id: 1 }), createDevice({ id: 2 })];
    Device.findByDomainId.mockResolvedValue(devices);

    const req = mockReq({ user: { id: 1, role: 'admin' } });
    const res = mockRes();

    await deviceController.getAll(req, res);

    expect(Device.findByDomainId).toHaveBeenCalledWith(1);
    expect(Device.findByUserId).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.arrayContaining([expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })])
    }));
  });

  it('usuário comum: deve chamar Device.findByUserId e retornar apenas os devices com acesso', async () => {
    const devices = [createDevice({ id: 3 })];
    Device.findByUserId.mockResolvedValue(devices);

    const req = mockReq({ user: { id: 2, role: 'user' } });
    const res = mockRes();

    await deviceController.getAll(req, res);

    expect(Device.findByUserId).toHaveBeenCalledWith(2);
    expect(Device.findByDomainId).not.toHaveBeenCalled();
  });

  it('admin sem domínio associado: deve retornar lista vazia (evita acesso global)', async () => {
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: null }));

    const req = mockReq({ user: { id: 1, role: 'admin' } });
    const res = mockRes();

    await deviceController.getAll(req, res);

    expect(Device.findByDomainId).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
  });
});

describe('create (CT-010)', () => {
  it('deve criar device, herdar domain_id do admin e conectar automaticamente ao MQTT', async () => {
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: 1 }));
    Domain.findById.mockResolvedValue(createDomain({ id: 1, max_devices: 5 }));
    Domain.countDevices.mockResolvedValue(2);
    const novoDevice = createDevice({ id: 10, domain_id: 1 });
    Device.create.mockResolvedValue(novoDevice);
    Device.getAssignedUsers.mockResolvedValue([]);

    const req = mockReq({
      user: { id: 1, role: 'admin' },
      body: { name: 'ESP32 Sala', mqttBroker: 'broker.hivemq.com', mqttPort: '1883', mqttTopic: 'sensors/esp32/01' }
    });
    const res = mockRes();

    await deviceController.create(req, res);

    expect(Device.create).toHaveBeenCalledWith(expect.objectContaining({ domain_id: 1, name: 'ESP32 Sala' }));
    expect(MqttService.connect).toHaveBeenCalledWith(novoDevice);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deve retornar 400 quando o limite de dispositivos do plano foi atingido', async () => {
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: 1 }));
    Domain.findById.mockResolvedValue(createDomain({ id: 1, max_devices: 3 }));
    Domain.countDevices.mockResolvedValue(3);

    const req = mockReq({
      user: { id: 1, role: 'admin' },
      body: { name: 'ESP32 Sala', mqttBroker: 'broker.hivemq.com', mqttPort: '1883', mqttTopic: 'sensors/esp32/01' }
    });
    const res = mockRes();

    await deviceController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Device.create).not.toHaveBeenCalled();
    expect(MqttService.connect).not.toHaveBeenCalled();
  });
});

describe('remove', () => {
  it('deve desconectar o MQTT ANTES de deletar o dispositivo', async () => {
    const device = createDevice({ id: 5, domain_id: 1 });
    Device.findById.mockResolvedValue(device);
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: 1 }));

    const callOrder = [];
    MqttService.disconnect.mockImplementation(() => callOrder.push('disconnect'));
    Device.delete.mockImplementation(async () => { callOrder.push('delete'); return true; });

    const req = mockReq({ user: { id: 1, role: 'admin' }, params: { id: '5' } });
    const res = mockRes();

    await deviceController.remove(req, res);

    expect(callOrder).toEqual(['disconnect', 'delete']);
    expect(MqttService.disconnect).toHaveBeenCalledWith(5);
    expect(Device.delete).toHaveBeenCalledWith('5');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('deve retornar 404 se o dispositivo não existe', async () => {
    Device.findById.mockResolvedValue(null);

    const req = mockReq({ user: { id: 1, role: 'admin' }, params: { id: '999' } });
    const res = mockRes();

    await deviceController.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(Device.delete).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se o dispositivo pertence a outro domínio', async () => {
    Device.findById.mockResolvedValue(createDevice({ id: 5, domain_id: 2 }));
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: 1 }));

    const req = mockReq({ user: { id: 1, role: 'admin' }, params: { id: '5' } });
    const res = mockRes();

    await deviceController.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Device.delete).not.toHaveBeenCalled();
    expect(MqttService.disconnect).not.toHaveBeenCalled();
  });
});
