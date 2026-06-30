// token.service é o wrapper que encapsula o jsonwebtoken. Usamos o jwt REAL
// aqui (sem mock) — mockar o jwt nesse teste não validaria nada de fato, e a
// operação é rápida o suficiente para não precisar de mock.
const jwt = require('jsonwebtoken');
const {
  generateToken,
  verifyToken,
  extractTokenFromHeader
} = require('../../../services/token.service');

describe('generateToken', () => {
  it('deve retornar uma string JWT não vazia', () => {
    const token = generateToken({ id: 1, email: 'joao@teste.com', role: 'admin' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('o token gerado deve ser decodificável com jwt.verify e conter os claims passados', () => {
    const token = generateToken({ id: 1, email: 'joao@teste.com', role: 'admin' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded.id).toBe(1);
    expect(decoded.email).toBe('joao@teste.com');
    expect(decoded.role).toBe('admin');
  });

  it('o token deve conter os campos id, email e role no payload', () => {
    const token = generateToken({ id: 7, email: 'maria@teste.com', role: 'user' });
    const decoded = jwt.decode(token);

    expect(decoded).toEqual(expect.objectContaining({ id: 7, email: 'maria@teste.com', role: 'user' }));
  });

  it('o token deve ter exp (expiração) definido', () => {
    const token = generateToken({ id: 1, email: 'joao@teste.com', role: 'admin' });
    const decoded = jwt.decode(token);

    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});

describe('verifyToken', () => {
  it('deve retornar o payload decodificado para um token válido', () => {
    const token = generateToken({ id: 1, email: 'joao@teste.com', role: 'admin' });
    const result = verifyToken(token);

    expect(result.id).toBe(1);
    expect(result.email).toBe('joao@teste.com');
    expect(result.role).toBe('admin');
  });

  it('deve lançar erro para token inválido', () => {
    expect(() => verifyToken('token-completamente-invalido')).toThrow('Token inválido');
  });

  it('deve lançar erro para token expirado', () => {
    const tokenExpirado = jwt.sign(
      { id: 1, email: 'joao@teste.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    expect(() => verifyToken(tokenExpirado)).toThrow('Token expirado');
  });

  it('deve lançar erro para token assinado com chave secreta diferente', () => {
    const tokenOutraChave = jwt.sign({ id: 1 }, 'outra-chave-secreta');
    expect(() => verifyToken(tokenOutraChave)).toThrow('Token inválido');
  });
});

describe('extractTokenFromHeader', () => {
  it('deve extrair o token de "Bearer <token>"', () => {
    const result = extractTokenFromHeader('Bearer abc123token');
    expect(result).toBe('abc123token');
  });

  it('deve retornar null para header sem o prefixo "Bearer "', () => {
    const result = extractTokenFromHeader('abc123token');
    expect(result).toBeNull();
  });

  it('deve retornar null para header ausente (undefined)', () => {
    const result = extractTokenFromHeader(undefined);
    expect(result).toBeNull();
  });

  it('deve retornar null para header vazio', () => {
    const result = extractTokenFromHeader('');
    expect(result).toBeNull();
  });
});
