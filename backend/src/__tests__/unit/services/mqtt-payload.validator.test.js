const { validateMqttPayload } = require('../../../services/mqtt-payload.validator');

describe('validateMqttPayload — sem expectedFields configurados', () => {
  it('deve aceitar payload JSON válido com valores numéricos', () => {
    const result = validateMqttPayload('{"temperature":25.3,"humidity":60}');
    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ temperature: 25.3, humidity: 60 });
  });

  it('deve rejeitar payload com valor string', () => {
    const result = validateMqttPayload('{"temperature":"quente"}');
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('deve rejeitar JSON malformado sem lançar exceção', () => {
    expect(() => validateMqttPayload('não é json')).not.toThrow();
    const result = validateMqttPayload('não é json');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/JSON inválido/i);
  });

  it('deve rejeitar payload que é um array', () => {
    const result = validateMqttPayload('[1,2,3]');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/objeto/i);
  });

  it('deve rejeitar payload numérico direto', () => {
    const result = validateMqttPayload('42');
    expect(result.valid).toBe(false);
  });

  it('deve rejeitar payload que é uma string JSON simples', () => {
    const result = validateMqttPayload('"string qualquer"');
    expect(result.valid).toBe(false);
  });

  it('deve rejeitar payload JSON null', () => {
    const result = validateMqttPayload('null');
    expect(result.valid).toBe(false);
  });
});

describe('validateMqttPayload — com expectedFields configurados', () => {
  const expectedFields = ['temperature', 'humidity'];

  it('deve aceitar quando todos os campos esperados estão presentes e são numéricos', () => {
    const result = validateMqttPayload('{"temperature":25.3,"humidity":60}', expectedFields);
    expect(result.valid).toBe(true);
  });

  it('deve aceitar campos extras além dos esperados', () => {
    const result = validateMqttPayload('{"temperature":25.3,"humidity":60,"co2":800}', expectedFields);
    expect(result.valid).toBe(true);
    expect(result.data.co2).toBe(800);
  });

  it('deve rejeitar quando falta um campo obrigatório', () => {
    const result = validateMqttPayload('{"temperature":25.3}', expectedFields);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'humidity')).toBe(true);
  });

  it('deve incluir o motivo e os erros detalhados na resposta de rejeição', () => {
    const result = validateMqttPayload('{"temperature":"quente","humidity":60}', expectedFields);
    expect(result.valid).toBe(false);
    expect(result.reason).toEqual(expect.any(String));
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
