jest.mock('../../../models/AccessRequest');
jest.mock('../../../models/Device');
jest.mock('../../../models/User');

const AccessRequest = require('../../../models/AccessRequest');
const Device = require('../../../models/Device');
const User = require('../../../models/User');
const accessController = require('../../../controllers/access.controller');
const { mockReq, mockRes } = require('../../helpers/mockReqRes');
const { createUser, createDevice, createAccessRequest } = require('../../helpers/factories');

beforeEach(() => {
  AccessRequest.toPublic.mockImplementation(request => {
    if (!request) return null;
    return {
      id: request.id,
      userId: request.user_id,
      deviceId: request.device_id,
      status: request.status
    };
  });
});

describe('create (CT-023)', () => {
  it('deve criar solicitação com status pending → 201', async () => {
    User.findById.mockResolvedValue(createUser({ id: 2, domain_id: 1 }));
    AccessRequest.hasPendingRequest.mockResolvedValue(false);
    Device.findById.mockResolvedValue(createDevice({ id: 1, domain_id: 1 }));
    Device.userHasAccess.mockResolvedValue(false);
    const novaSolicitacao = createAccessRequest({ id: 7, user_id: 2, device_id: 1, status: 'pending' });
    AccessRequest.create.mockResolvedValue(novaSolicitacao);

    const req = mockReq({ user: { id: 2 }, body: { deviceId: 1, message: 'Preciso monitorar a sala' } });
    const res = mockRes();

    await accessController.create(req, res);

    expect(AccessRequest.create).toHaveBeenCalledWith(2, 1, 'Preciso monitorar a sala');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      request: expect.objectContaining({ status: 'pending' })
    }));
  });

  it('deve rejeitar se o device não pertence ao domínio do usuário', async () => {
    AccessRequest.hasPendingRequest.mockResolvedValue(false);
    Device.findById.mockResolvedValue(createDevice({ id: 1, domain_id: 2 }));
    User.findById.mockResolvedValue(createUser({ id: 2, domain_id: 1 }));

    const req = mockReq({ user: { id: 2 }, body: { deviceId: 1, message: 'msg' } });
    const res = mockRes();

    await accessController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(AccessRequest.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar se já existe um pedido pendente duplicado', async () => {
    AccessRequest.hasPendingRequest.mockResolvedValue(true);

    const req = mockReq({ user: { id: 2 }, body: { deviceId: 1, message: 'msg' } });
    const res = mockRes();

    await accessController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(AccessRequest.create).not.toHaveBeenCalled();
  });
});

describe('approve (CT-024)', () => {
  it('deve aprovar solicitação de device específico: status approved, has_access ativado, device_users atualizado', async () => {
    const request = createAccessRequest({ id: 7, user_id: 2, device_id: 1, status: 'pending', user_domain_id: 1 });
    AccessRequest.findById.mockResolvedValue(request);
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: 1 }));
    Device.findById.mockResolvedValue(createDevice({ id: 1, domain_id: 1 }));
    AccessRequest.approve.mockResolvedValue({ ...request, status: 'approved' });
    User.updateAccess.mockResolvedValue(createUser({ id: 2, has_access: true }));
    Device.getAssignedUsers.mockResolvedValue([{ id: 5 }]);
    Device.setAssignedUsers.mockResolvedValue([]);

    const req = mockReq({ user: { id: 1 }, params: { id: '7' } });
    const res = mockRes();

    await accessController.approve(req, res);

    expect(AccessRequest.approve).toHaveBeenCalledWith('7');
    expect(User.updateAccess).toHaveBeenCalledWith(2, true);
    expect(Device.setAssignedUsers).toHaveBeenCalledWith(1, [5, 2]);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('deve retornar 404 se a solicitação não existe', async () => {
    AccessRequest.findById.mockResolvedValue(null);

    const req = mockReq({ user: { id: 1 }, params: { id: '999' } });
    const res = mockRes();

    await accessController.approve(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deve retornar 400 se a solicitação já foi processada', async () => {
    AccessRequest.findById.mockResolvedValue(createAccessRequest({ status: 'approved' }));

    const req = mockReq({ user: { id: 1 }, params: { id: '7' } });
    const res = mockRes();

    await accessController.approve(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar 403 se a solicitação não pertence ao domínio do admin', async () => {
    AccessRequest.findById.mockResolvedValue(createAccessRequest({ status: 'pending', user_domain_id: 2 }));
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: 1 }));

    const req = mockReq({ user: { id: 1 }, params: { id: '7' } });
    const res = mockRes();

    await accessController.approve(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(AccessRequest.approve).not.toHaveBeenCalled();
  });
});

describe('reject (CT-025)', () => {
  it('deve atualizar o status da solicitação para rejected', async () => {
    const request = createAccessRequest({ id: 7, status: 'pending', user_domain_id: 1 });
    AccessRequest.findById.mockResolvedValue(request);
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: 1 }));
    AccessRequest.reject.mockResolvedValue({ ...request, status: 'rejected' });

    const req = mockReq({ user: { id: 1 }, params: { id: '7' } });
    const res = mockRes();

    await accessController.reject(req, res);

    expect(AccessRequest.reject).toHaveBeenCalledWith('7');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('deve retornar 400 se a solicitação já foi processada', async () => {
    AccessRequest.findById.mockResolvedValue(createAccessRequest({ status: 'rejected' }));

    const req = mockReq({ user: { id: 1 }, params: { id: '7' } });
    const res = mockRes();

    await accessController.reject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(AccessRequest.reject).not.toHaveBeenCalled();
  });
});

describe('countPending (CT-026)', () => {
  it('deve retornar a contagem de pedidos pendentes do domínio do admin', async () => {
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: 1 }));
    AccessRequest.countPendingByDomainId.mockResolvedValue(4);

    const req = mockReq({ user: { id: 1 } });
    const res = mockRes();

    await accessController.countPending(req, res);

    expect(AccessRequest.countPendingByDomainId).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 4 }));
  });

  it('deve retornar 0 quando o admin não tem domínio associado', async () => {
    User.findById.mockResolvedValue(createUser({ id: 1, role: 'admin', domain_id: null }));

    const req = mockReq({ user: { id: 1 } });
    const res = mockRes();

    await accessController.countPending(req, res);

    expect(AccessRequest.countPendingByDomainId).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 0 }));
  });
});
