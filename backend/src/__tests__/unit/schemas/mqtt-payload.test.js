// O sistema possui DUAS camadas de validação para payloads MQTT:
//  1. schemas/mqtt-payload.schema.js → buildPayloadSchema(fields): monta o
//     schema Zod (genérico via z.record ou específico via z.object.passthrough)
//  2. services/mqtt-payload.validator.js → validateMqttPayload(raw, fields):
//     usa o schema acima, mas antes faz JSON.parse e checagem de estrutura.
//     É essa função que o pipeline MQTT real (mqtt.service.js) chama.
// Este arquivo testa a camada 1 (buildPayloadSchema) isoladamente.

const { buildPayloadSchema } = require('../../../schemas/mqtt-payload.schema');

describe('buildPayloadSchema — sem campos configurados (modo genérico)', () => {
  const schema = buildPayloadSchema([]);

  it('deve aceitar payload com múltiplos valores numéricos', () => {
    const result = schema.safeParse({ temperature: 25.3, humidity: 60 });
    expect(result.success).toBe(true);
  });

  it('deve aceitar payload com um único campo numérico', () => {
    const result = schema.safeParse({ temperature: 25.3 });
    expect(result.success).toBe(true);
  });

  it('deve aceitar payload com muitos campos numéricos', () => {
    const result = schema.safeParse({ temp: 1, hum: 2, press: 3, co2: 4 });
    expect(result.success).toBe(true);
  });

  it('deve aceitar payload vazio ({}) — z.record não exige nenhuma chave', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('deve rejeitar payload com valor string', () => {
    const result = schema.safeParse({ temperature: 'quente' });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar payload com valor boolean', () => {
    const result = schema.safeParse({ temperature: true });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar payload com valor null', () => {
    const result = schema.safeParse({ temperature: null });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar payload com valor array', () => {
    const result = schema.safeParse({ temperature: [1, 2, 3] });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar payload com valores mistos (um numérico, um string)', () => {
    const result = schema.safeParse({ temperature: 25.3, humidity: 'alta' });
    expect(result.success).toBe(false);
  });
});

describe('buildPayloadSchema — com campos configurados (modo específico)', () => {
  const schema = buildPayloadSchema(['temperature', 'humidity']);

  it('deve aceitar quando todos os campos obrigatórios estão presentes', () => {
    const result = schema.safeParse({ temperature: 25.3, humidity: 60 });
    expect(result.success).toBe(true);
  });

  it('deve permitir campos extras além dos esperados (passthrough)', () => {
    const result = schema.safeParse({ temperature: 25.3, humidity: 60, co2: 800 });
    expect(result.success).toBe(true);
    expect(result.data.co2).toBe(800);
  });

  it('deve rejeitar quando um campo obrigatório está ausente', () => {
    const result = schema.safeParse({ temperature: 25.3 });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('humidity'))).toBe(true);
  });

  it('deve rejeitar quando um campo obrigatório tem tipo errado', () => {
    const result = schema.safeParse({ temperature: 'quente', humidity: 60 });
    expect(result.success).toBe(false);
  });
});
