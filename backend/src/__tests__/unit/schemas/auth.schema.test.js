const {
  loginSchema,
  registerSchema,
  joinDomainSchema,
  createDomainSchema,
  leaveDomainSchema
} = require('../../../schemas/auth.schema');

describe('loginSchema', () => {
  it('deve aceitar email válido e senha', () => {
    const result = loginSchema.safeParse({ email: 'joao@teste.com', password: '123456' });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar email inválido', () => {
    const result = loginSchema.safeParse({ email: 'invalido', password: '123456' });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('email'))).toBe(true);
  });

  it('deve rejeitar quando a senha está ausente', () => {
    const result = loginSchema.safeParse({ email: 'joao@teste.com' });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('password'))).toBe(true);
  });

  it('deve rejeitar quando o email está ausente', () => {
    const result = loginSchema.safeParse({ password: '123456' });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('email'))).toBe(true);
  });

  it('deve rejeitar body vazio', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valido = { username: 'João Teste', email: 'joao@teste.com', password: '123456' };

  it('deve aceitar dados completos válidos', () => {
    const result = registerSchema.safeParse(valido);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar username com menos de 2 caracteres', () => {
    const result = registerSchema.safeParse({ ...valido, username: 'J' });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('username'))).toBe(true);
  });

  it('deve rejeitar username com mais de 100 caracteres', () => {
    const result = registerSchema.safeParse({ ...valido, username: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar email inválido', () => {
    const result = registerSchema.safeParse({ ...valido, email: 'nao-e-email' });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('email'))).toBe(true);
  });

  it('deve rejeitar senha com menos de 6 caracteres', () => {
    const result = registerSchema.safeParse({ ...valido, password: '123' });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('password'))).toBe(true);
  });

  it('deve rejeitar quando faltam campos obrigatórios', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
    const fields = result.error.issues.map(i => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['username', 'email', 'password']));
  });
});

describe('joinDomainSchema', () => {
  it('deve aceitar apenas domainCode', () => {
    const result = joinDomainSchema.safeParse({ domainCode: 'EMP01' });
    expect(result.success).toBe(true);
  });

  it('deve aceitar domainCode com requestedDevices', () => {
    const result = joinDomainSchema.safeParse({ domainCode: 'EMP01', requestedDevices: [1, 2, 3] });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar sem domainCode', () => {
    const result = joinDomainSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('deve rejeitar requestedDevices com valores não numéricos', () => {
    const result = joinDomainSchema.safeParse({ domainCode: 'EMP01', requestedDevices: ['a', 'b'] });
    expect(result.success).toBe(false);
  });
});

describe('createDomainSchema', () => {
  it('deve aceitar domainName e domainCode válidos', () => {
    const result = createDomainSchema.safeParse({ domainName: 'Empresa X', domainCode: 'EMP01' });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar sem domainName', () => {
    const result = createDomainSchema.safeParse({ domainCode: 'EMP01' });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar sem domainCode', () => {
    const result = createDomainSchema.safeParse({ domainName: 'Empresa X' });
    expect(result.success).toBe(false);
  });
});

describe('leaveDomainSchema', () => {
  it('deve aceitar body vazio (transferToUserId é opcional)', () => {
    const result = leaveDomainSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('deve aceitar transferToUserId numérico', () => {
    const result = leaveDomainSchema.safeParse({ transferToUserId: 5 });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar transferToUserId não numérico', () => {
    const result = leaveDomainSchema.safeParse({ transferToUserId: 'cinco' });
    expect(result.success).toBe(false);
  });
});
