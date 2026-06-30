const { z } = require('zod');
const { validate } = require('../../../middleware/validate.middleware');
const { mockReq, mockRes, mockNext } = require('../../helpers/mockReqRes');

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

describe('validate(schema)', () => {
  it('deve chamar next() quando req.body é válido', () => {
    const req = mockReq({ body: { email: 'joao@teste.com', password: '123456' } });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 400 com erros formatados quando req.body é inválido', () => {
    const req = mockReq({ body: { email: 'invalido', password: '' } });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Dados inválidos',
      details: expect.any(Array)
    }));
  });

  it('não deve chamar next() quando a validação falha', () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  it('deve incluir o nome do campo e a mensagem de erro na resposta', () => {
    const req = mockReq({ body: { email: 'invalido', password: '123456' } });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.details).toContainEqual({ field: 'email', message: 'E-mail inválido' });
  });
});
