// Fábrica de req/res mockados para testes de controllers e middlewares.
// Confirmado nos controllers reais: o padrão é sempre res.status(N).json({...})
// (nunca res.send() puro), então status/json retornam `res` para permitir chaining.

const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null, // populado pelo middleware authenticate
  ...overrides
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => jest.fn();

module.exports = { mockReq, mockRes, mockNext };
