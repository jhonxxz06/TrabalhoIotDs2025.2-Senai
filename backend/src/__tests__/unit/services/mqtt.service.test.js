// mqtt.service.js é o módulo mais complexo do backend. Dependências externas:
//   - 'mqtt' (cliente MQTT)
//   - '../config/database' (pool PostgreSQL — saveData usa pool.connect()
//     transacional com advisory lock, não pool.query() simples)
//   - './notification.service' (verificação de excedências, fire-and-forget)
// O validador (./mqtt-payload.validator) NÃO é mockado — é uma função pura
// (Zod) e queremos exercitar a validação real nos testes de payload.
//
// Observação: connections/latestData/rejectedPayloads são Maps privados do
// módulo (não exportados) e NÃO são resetados entre testes (clearMocks só
// limpa mocks do Jest, não estado de módulo). Por isso cada teste usa um
// deviceId único, evitando que o branch "já conectado" (connect idempotente)
// interfira entre os testes.

jest.mock('mqtt', () => ({ connect: jest.fn() }));
jest.mock('../../../config/database', () => ({
  pool: { connect: jest.fn() },
  query: jest.fn(),
  queryOne: jest.fn(),
  run: jest.fn(),
  getDatabase: jest.fn(),
  initDatabase: jest.fn()
}));
jest.mock('../../../services/notification.service', () => ({
  check: jest.fn(),
  init: jest.fn(),
  refreshWidgetCache: jest.fn(),
  resetCounters: jest.fn()
}));

const EventEmitter = require('events');
const mqtt = require('mqtt');
const database = require('../../../config/database');
const notificationService = require('../../../services/notification.service');
const MqttService = require('../../../services/mqtt.service');
const { createDevice } = require('../../helpers/factories');

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

const createMockMqttClient = () => {
  const client = new EventEmitter();
  client.subscribe = jest.fn();
  client.end = jest.fn();
  client.publish = jest.fn();
  client.connected = true;
  return client;
};

let mockClient;

beforeEach(() => {
  mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn()
  };
  database.pool.connect.mockResolvedValue(mockClient);
  notificationService.check.mockResolvedValue();
  mqtt.connect.mockImplementation(() => createMockMqttClient());
});

describe('connect', () => {
  it('deve chamar mqtt.connect com broker, port e credenciais do device', () => {
    const device = createDevice({ id: 101, mqtt_broker: 'broker.hivemq.com', mqtt_port: '1883', mqtt_username: 'esp32user', mqtt_password: 'segredo' });

    MqttService.connect(device);

    expect(mqtt.connect).toHaveBeenCalledWith(
      'mqtt://broker.hivemq.com:1883',
      expect.objectContaining({ username: 'esp32user', password: 'segredo', clean: true })
    );
  });

  it('deve fazer subscribe no tópico (QoS 1) após o evento "connect" do client', () => {
    const device = createDevice({ id: 102, mqtt_topic: 'sensors/device102' });

    MqttService.connect(device);
    const client = mqtt.connect.mock.results[0].value;
    client.emit('connect');

    expect(client.subscribe).toHaveBeenCalledWith('sensors/device102', { qos: 1 }, expect.any(Function));
  });

  it('deve armazenar o client no Map de conexões ativas', () => {
    const device = createDevice({ id: 103 });

    MqttService.connect(device);
    const client = mqtt.connect.mock.results[0].value;
    client.connected = true;

    expect(MqttService.isConnected(103)).toBe(true);
  });

  it('deve retornar o client mqtt criado', () => {
    const device = createDevice({ id: 104 });

    const result = MqttService.connect(device);
    const client = mqtt.connect.mock.results[0].value;

    expect(result).toBe(client);
  });

  it('não deve reconectar (nem chamar mqtt.connect de novo) se o device já está conectado', () => {
    const device = createDevice({ id: 105 });

    MqttService.connect(device);
    MqttService.connect(device);

    expect(mqtt.connect).toHaveBeenCalledTimes(1);
  });
});

describe('disconnect', () => {
  it('deve chamar client.end() para o deviceId informado', () => {
    const device = createDevice({ id: 106 });
    MqttService.connect(device);
    const client = mqtt.connect.mock.results[0].value;

    MqttService.disconnect(106);

    expect(client.end).toHaveBeenCalledTimes(1);
  });

  it('deve remover o client do Map de conexões ativas (reconectar volta a chamar mqtt.connect)', () => {
    const device = createDevice({ id: 107 });
    MqttService.connect(device);
    MqttService.disconnect(107);

    mqtt.connect.mockClear();
    MqttService.connect(device);

    expect(mqtt.connect).toHaveBeenCalledTimes(1);
  });

  it('não deve lançar erro se o deviceId não existir no Map', () => {
    expect(() => MqttService.disconnect(999999)).not.toThrow();
  });
});

describe('recebimento de mensagem (fluxo principal)', () => {
  it('payload válido: deve persistir no banco e emitir via Socket.IO', async () => {
    const device = createDevice({ id: 200, mqtt_topic: 'sensors/device200' });
    const mockEmit = jest.fn();
    const mockIo = { to: jest.fn().mockReturnValue({ emit: mockEmit }) };
    MqttService.setSocketIO(mockIo);

    MqttService.connect(device);
    const client = mqtt.connect.mock.results[0].value;

    client.emit('message', 'sensors/device200', Buffer.from(JSON.stringify({ temperature: 25.3 })));
    await flushPromises();
    await flushPromises();

    const insertCall = mockClient.query.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('INSERT INTO mqtt_data')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1]).toEqual([200, 'sensors/device200', { temperature: 25.3 }]);

    expect(mockIo.to).toHaveBeenCalledWith('device:200');
    expect(mockEmit).toHaveBeenCalledWith('mqtt:data', expect.objectContaining({
      deviceId: 200,
      topic: 'sensors/device200'
    }));
  });

  it('payload inválido (valor string): NÃO deve persistir nem emitir mqtt:data', async () => {
    const device = createDevice({ id: 201, mqtt_topic: 'sensors/device201' });
    const mockEmit = jest.fn();
    const mockIo = { to: jest.fn().mockReturnValue({ emit: mockEmit }) };
    MqttService.setSocketIO(mockIo);

    MqttService.connect(device);
    const client = mqtt.connect.mock.results[0].value;

    client.emit('message', 'sensors/device201', Buffer.from(JSON.stringify({ temperature: 'quente' })));
    await flushPromises();
    await flushPromises();

    const insertCall = mockClient.query.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('INSERT INTO mqtt_data')
    );
    expect(insertCall).toBeUndefined();

    expect(mockEmit).not.toHaveBeenCalledWith('mqtt:data', expect.anything());
    expect(mockEmit).toHaveBeenCalledWith('mqtt:validation_error', expect.objectContaining({ deviceId: 201 }));
    expect(MqttService.getRejected(201)).toHaveLength(1);
  });

  it('payload não-JSON: NÃO deve persistir e NÃO deve lançar exceção', async () => {
    const device = createDevice({ id: 202, mqtt_topic: 'sensors/device202' });
    MqttService.connect(device);
    const client = mqtt.connect.mock.results[0].value;

    expect(() => {
      client.emit('message', 'sensors/device202', Buffer.from('não é json'));
    }).not.toThrow();

    await flushPromises();

    const insertCall = mockClient.query.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('INSERT INTO mqtt_data')
    );
    expect(insertCall).toBeUndefined();
    expect(MqttService.getRejected(202)).toHaveLength(1);
    expect(MqttService.getRejected(202)[0].reason).toMatch(/JSON inválido/i);
  });

  it('payload duplicado nos últimos 5s: NÃO deve inserir novamente (proteção anti-duplicata)', async () => {
    const device = createDevice({ id: 203, mqtt_topic: 'sensors/device203' });
    mockClient.query.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.startsWith('SELECT id, payload, received_at')) {
        return Promise.resolve({
          rows: [{ id: 1, payload: { temperature: 25.3 }, received_at: new Date().toISOString() }]
        });
      }
      return Promise.resolve({ rows: [] });
    });

    MqttService.connect(device);
    const client = mqtt.connect.mock.results[0].value;

    client.emit('message', 'sensors/device203', Buffer.from(JSON.stringify({ temperature: 25.3 })));
    await flushPromises();
    await flushPromises();

    const insertCall = mockClient.query.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('INSERT INTO mqtt_data')
    );
    expect(insertCall).toBeUndefined();
    const commitCall = mockClient.query.mock.calls.find(call => call[0] === 'COMMIT');
    expect(commitCall).toBeDefined();
  });
});
