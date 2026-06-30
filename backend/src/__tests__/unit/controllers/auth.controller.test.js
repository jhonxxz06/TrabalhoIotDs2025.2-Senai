// auth.controller.js importa: bcryptjs, models/User, models/Domain,
// models/AccessRequest, models/Device e services/token.service.
// Não há superadmin hardcoded no controller real — o sistema é estritamente
// multi-tenant (confirmado lendo o arquivo-fonte).
jest.mock('bcryptjs');
jest.mock('../../../models/User');
jest.mock('../../../models/Domain');
jest.mock('../../../models/AccessRequest');
jest.mock('../../../models/Device');
jest.mock('../../../services/token.service');

const bcrypt = require('bcryptjs');
const User = require('../../../models/User');
const Domain = require('../../../models/Domain');
const AccessRequest = require('../../../models/AccessRequest');
const { generateToken } = require('../../../services/token.service');
const authController = require('../../../controllers/auth.controller');
const { mockReq, mockRes } = require('../../helpers/mockReqRes');
const { createUser, createDomain } = require('../../helpers/factories');

// User.toPublic é automockado pelo jest.mock('../../../models/User') — sem
// implementação real, retornaria undefined. Reimplementamos a lógica real
// (remove password, expõe hasAccess/domainId/domainName) para que as
// asserções sobre o corpo da resposta façam sentido.
beforeEach(() => {
  User.toPublic.mockImplementation(user => {
    if (!user) return null;
    const { password, domain_name, ...rest } = user;
    return {
      ...rest,
      hasAccess: Boolean(user.has_access),
      domainId: user.domain_id ?? null,
      domainName: domain_name ?? null
    };
  });
});

describe('register', () => {
  it('CT-001: cadastro de gerente com dados válidos → 201, JWT retornado, domínio criado', async () => {
    User.findByEmail.mockResolvedValue(null);
    Domain.findByCode.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hash-simulado');
    Domain.create.mockResolvedValue(createDomain({ id: 1, code: 'EMP01' }));
    const novoUsuario = createUser({ id: 1, role: 'admin', has_access: true, domain_id: 1 });
    User.create.mockResolvedValue(novoUsuario);
    Domain.setAdmin.mockResolvedValue(createDomain({ id: 1, admin_id: 1 }));
    generateToken.mockReturnValue('fake-jwt-token');

    const req = mockReq({
      body: {
        username: 'João Gerente',
        email: 'joao@empresa.com',
        password: 'senha123',
        isManager: true,
        domainName: 'Empresa X',
        domainCode: 'EMP01'
      }
    });
    const res = mockRes();

    await authController.register(req, res);

    expect(Domain.create).toHaveBeenCalledWith('Empresa X', 'EMP01', null);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      role: 'admin',
      has_access: true,
      domain_id: 1
    }));
    expect(Domain.setAdmin).toHaveBeenCalledWith(1, 1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ token: 'fake-jwt-token' })
    }));
  });

  it('CT-002: cadastro com email já existente → 400', async () => {
    User.findByEmail.mockResolvedValue(createUser({ email: 'joao@empresa.com' }));

    const req = mockReq({
      body: { username: 'João', email: 'joao@empresa.com', password: 'senha123', isManager: true, domainName: 'X', domainCode: 'X01' }
    });
    const res = mockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringMatching(/e-mail/i)
    }));
    expect(User.create).not.toHaveBeenCalled();
  });

  it('CT-003: cadastro com código de domínio duplicado → 400', async () => {
    User.findByEmail.mockResolvedValue(null);
    Domain.findByCode.mockResolvedValue(createDomain({ code: 'EMP01' }));

    const req = mockReq({
      body: { username: 'João', email: 'joao@empresa.com', password: 'senha123', isManager: true, domainName: 'Empresa X', domainCode: 'EMP01' }
    });
    const res = mockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringMatching(/código/i)
    }));
    expect(Domain.create).not.toHaveBeenCalled();
  });

  it('CT-004: cadastro de usuário comum com domainCode válido → 201, role user, has_access false', async () => {
    User.findByEmail.mockResolvedValue(null);
    Domain.findByCode.mockResolvedValue(createDomain({ id: 1, code: 'EMP01', max_users: 10 }));
    Domain.countUsers.mockResolvedValue(2);
    bcrypt.hash.mockResolvedValue('hash-simulado');
    const novoUsuario = createUser({ id: 2, role: 'user', has_access: false, domain_id: 1 });
    User.create.mockResolvedValue(novoUsuario);
    AccessRequest.create.mockResolvedValue({});
    generateToken.mockReturnValue('fake-jwt-token');

    const req = mockReq({
      body: {
        username: 'Maria Usuária',
        email: 'maria@empresa.com',
        password: 'senha123',
        isManager: false,
        domainCode: 'EMP01'
      }
    });
    const res = mockRes();

    await authController.register(req, res);

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      role: 'user',
      has_access: false,
      domain_id: 1
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('CT-005: cadastro com domainCode inexistente → 404', async () => {
    User.findByEmail.mockResolvedValue(null);
    Domain.findByCode.mockResolvedValue(null);

    const req = mockReq({
      body: { username: 'Maria', email: 'maria@empresa.com', password: 'senha123', isManager: false, domainCode: 'INEXISTENTE' }
    });
    const res = mockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringMatching(/domínio não encontrado/i)
    }));
    expect(User.create).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  it('CT-006: login com credenciais corretas → 200, JWT retornado, sem campo password', async () => {
    const user = createUser({ id: 1, domain_id: 1, password: '$2b$10$hash' });
    User.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    Domain.findById.mockResolvedValue(createDomain({ id: 1, code: 'EMP01' }));
    Domain.countUsers.mockResolvedValue(3);
    generateToken.mockReturnValue('fake-jwt-token');

    const req = mockReq({ body: { email: user.email, password: 'senha123', domainCode: 'EMP01' } });
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.token).toBe('fake-jwt-token');
    expect(payload.data.user.password).toBeUndefined();
  });

  it('CT-007: login com senha incorreta → 401', async () => {
    const user = createUser({ password: '$2b$10$hash' });
    User.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);

    const req = mockReq({ body: { email: user.email, password: 'senhaerrada', domainCode: 'EMP01' } });
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(generateToken).not.toHaveBeenCalled();
  });

  it('deve retornar 401 com email inexistente sem revelar se o email existe', async () => {
    User.findByEmail.mockResolvedValue(null);

    const req = mockReq({ body: { email: 'naoexiste@teste.com', password: 'qualquer', domainCode: 'EMP01' } });
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringMatching(/e-mail ou senha inválidos/i)
    }));
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o domainCode informado é diferente do domínio do usuário', async () => {
    const user = createUser({ domain_id: 1, password: '$2b$10$hash' });
    User.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    Domain.findById.mockResolvedValue(createDomain({ id: 1, code: 'EMP01' }));

    const req = mockReq({ body: { email: user.email, password: 'senha123', domainCode: 'OUTRO99' } });
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(generateToken).not.toHaveBeenCalled();
  });

  it('deve retornar 400 quando o usuário pertence a um domínio mas não informa domainCode', async () => {
    const user = createUser({ domain_id: 1, password: '$2b$10$hash' });
    User.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    Domain.findById.mockResolvedValue(createDomain({ id: 1, code: 'EMP01' }));

    const req = mockReq({ body: { email: user.email, password: 'senha123' } });
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('me', () => {
  it('deve retornar os dados do usuário autenticado sem o campo password', async () => {
    const user = createUser({ id: 1, domain_id: 1, password: '$2b$10$hash' });
    User.findById.mockResolvedValue(user);
    Domain.findById.mockResolvedValue(createDomain({ id: 1 }));
    Domain.countUsers.mockResolvedValue(1);

    const req = mockReq({ user: { id: 1 } });
    const res = mockRes();

    await authController.me(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.user.password).toBeUndefined();
    expect(payload.data.user.id).toBe(1);
  });

  it('deve retornar 404 quando o usuário não existe mais', async () => {
    User.findById.mockResolvedValue(null);

    const req = mockReq({ user: { id: 999 } });
    const res = mockRes();

    await authController.me(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
