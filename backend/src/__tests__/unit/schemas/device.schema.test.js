const { createDeviceSchema, updateDeviceSchema } = require('../../../schemas/device.schema');

describe('createDeviceSchema', () => {
  const valido = {
    name: 'ESP32 Sala',
    mqttBroker: 'broker.hivemq.com',
    mqttTopic: 'sensors/esp32/01'
  };

  it('deve aceitar device com apenas os campos obrigatórios', () => {
    const result = createDeviceSchema.safeParse(valido);
    expect(result.success).toBe(true);
  });

  it('deve preencher mqttPort com o padrão "1883" quando ausente', () => {
    const result = createDeviceSchema.safeParse(valido);
    expect(result.success).toBe(true);
    expect(result.data.mqttPort).toBe('1883');
  });

  it('deve aceitar device com campos opcionais (mqttUsername, mqttPassword, assignedUsers)', () => {
    const result = createDeviceSchema.safeParse({
      ...valido,
      mqttUsername: 'esp32user',
      mqttPassword: 'senha123',
      assignedUsers: [1, 2, 3]
    });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar sem nome', () => {
    const { name, ...semNome } = valido;
    const result = createDeviceSchema.safeParse(semNome);
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true);
  });

  it('deve rejeitar sem mqttBroker', () => {
    const { mqttBroker, ...semBroker } = valido;
    const result = createDeviceSchema.safeParse(semBroker);
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('mqttBroker'))).toBe(true);
  });

  it('deve rejeitar sem mqttTopic', () => {
    const { mqttTopic, ...semTopic } = valido;
    const result = createDeviceSchema.safeParse(semTopic);
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.includes('mqttTopic'))).toBe(true);
  });

  it('deve rejeitar nome com mais de 100 caracteres', () => {
    const result = createDeviceSchema.safeParse({ ...valido, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('updateDeviceSchema', () => {
  it('deve aceitar atualização parcial (apenas name)', () => {
    const result = updateDeviceSchema.safeParse({ name: 'Novo nome' });
    expect(result.success).toBe(true);
  });

  it('deve aceitar body vazio (todos os campos são opcionais via partial)', () => {
    const result = updateDeviceSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
