// auth.middleware.js usa token.service.js (verifyToken, extractTokenFromHeader),
// não jsonwebtoken diretamente — por isso mockamos o token.service.
jest.mock('../../../services/token.service');

const { verifyToken, extractTokenFromHeader } = require('../../../services/token.service');
const { authenticate, optionalAuth } = require('../../../middleware/auth.middleware');
const { mockReq, mockRes, mockNext } = require('../../helpers/mockReqRes');

describe('authenticate', () => {
  it('deve popular req.user e chamar next() com token válido', () => {
    extractTokenFromHeader.mockReturnValue('token-valido');
    verifyToken.mockReturnValue({ id: 1, email: 'joao@teste.com', role: 'admin' });

    const req = mockReq({ headers: { authorization: 'Bearer token-valido' } });
    const res = mockRes();
    const next = mockNext();

    authenticate(req, res, next);

    expect(req.user).toEqual({ id: 1, email: 'joao@teste.com', role: 'admin' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o header Authorization está ausente', () => {
    extractTokenFromHeader.mockReturnValue(null);

    const req = mockReq({ headers: {} });
    const res = mockRes();
    const next = mockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o token é inválido ou expirado', () => {
    extractTokenFromHeader.mockReturnValue('token-invalido');
    verifyToken.mockImplementation(() => { throw new Error('Token inválido'); });

    const req = mockReq({ headers: { authorization: 'Bearer token-invalido' } });
    const res = mockRes();
    const next = mockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o header tem formato incorreto (sem "Bearer ")', () => {
    extractTokenFromHeader.mockReturnValue(null);

    const req = mockReq({ headers: { authorization: 'token-sem-prefixo' } });
    const res = mockRes();
    const next = mockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  it('deve popular req.user e chamar next() com token válido', () => {
    extractTokenFromHeader.mockReturnValue('token-valido');
    verifyToken.mockReturnValue({ id: 1, email: 'joao@teste.com', role: 'user' });

    const req = mockReq({ headers: { authorization: 'Bearer token-valido' } });
    const res = mockRes();
    const next = mockNext();

    optionalAuth(req, res, next);

    expect(req.user).toEqual({ id: 1, email: 'joao@teste.com', role: 'user' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve chamar next() sem erro quando não há token', () => {
    extractTokenFromHeader.mockReturnValue(null);

    const req = mockReq({ headers: {} });
    const res = mockRes();
    const next = mockNext();

    optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve chamar next() sem erro quando o token é inválido', () => {
    extractTokenFromHeader.mockReturnValue('token-invalido');
    verifyToken.mockImplementation(() => { throw new Error('Token inválido'); });

    const req = mockReq({ headers: { authorization: 'Bearer token-invalido' } });
    const res = mockRes();
    const next = mockNext();

    optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
