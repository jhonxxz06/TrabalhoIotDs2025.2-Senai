// rbac.middleware.js NÃO confia apenas no req.user.role do token — ele
// consulta o banco via User model para pegar o role atualizado. Por isso
// mockamos o model, não apenas o req.user.
jest.mock('../../../models/User');

const User = require('../../../models/User');
const { requireAdmin, requireUser, requireRole } = require('../../../middleware/rbac.middleware');
const { mockReq, mockRes, mockNext } = require('../../helpers/mockReqRes');
const { createUser } = require('../../helpers/factories');

describe('requireAdmin', () => {
  it('deve chamar next() quando o role do banco é admin', async () => {
    User.findById.mockResolvedValue(createUser({ role: 'admin' }));

    const req = mockReq({ user: { id: 1, role: 'admin' } });
    const res = mockRes();
    const next = mockNext();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 403 quando o role do banco é user', async () => {
    User.findById.mockResolvedValue(createUser({ role: 'user' }));

    const req = mockReq({ user: { id: 1, role: 'admin' } }); // token desatualizado
    const res = mockRes();
    const next = mockNext();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando req.user é undefined/null', async () => {
    const req = mockReq({ user: null });
    const res = mockRes();
    const next = mockNext();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('deve retornar 403 quando o usuário não existe mais no banco', async () => {
    User.findById.mockResolvedValue(null);

    const req = mockReq({ user: { id: 999, role: 'admin' } });
    const res = mockRes();
    const next = mockNext();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('usa o role do banco (não o do token) para a decisão de autorização', async () => {
    // Token diz 'user', mas o banco diz 'admin' — o middleware deve confiar no banco
    User.findById.mockResolvedValue(createUser({ role: 'admin' }));

    const req = mockReq({ user: { id: 1, role: 'user' } });
    const res = mockRes();
    const next = mockNext();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.role).toBe('admin'); // middleware atualiza req.user.role
  });

  it('deve retornar 403 se o role no banco foi rebaixado após a emissão do token', async () => {
    // Token foi emitido quando o usuário ainda era admin; banco já reflete o rebaixamento
    User.findById.mockResolvedValue(createUser({ role: 'user' }));

    const req = mockReq({ user: { id: 1, role: 'admin' } });
    const res = mockRes();
    const next = mockNext();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve retornar 500 quando a consulta ao banco lança erro', async () => {
    User.findById.mockRejectedValue(new Error('Erro de conexão'));

    const req = mockReq({ user: { id: 1, role: 'admin' } });
    const res = mockRes();
    const next = mockNext();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireUser', () => {
  it('deve chamar next() para role user', async () => {
    User.findById.mockResolvedValue(createUser({ role: 'user' }));

    const req = mockReq({ user: { id: 1, role: 'user' } });
    const res = mockRes();
    const next = mockNext();

    await requireUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve chamar next() para role admin', async () => {
    User.findById.mockResolvedValue(createUser({ role: 'admin' }));

    const req = mockReq({ user: { id: 1, role: 'admin' } });
    const res = mockRes();
    const next = mockNext();

    await requireUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('requireRole (genérico)', () => {
  it('deve permitir múltiplos roles configurados', async () => {
    User.findById.mockResolvedValue(createUser({ role: 'user' }));
    const middleware = requireRole(['admin', 'user']);

    const req = mockReq({ user: { id: 1, role: 'user' } });
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
