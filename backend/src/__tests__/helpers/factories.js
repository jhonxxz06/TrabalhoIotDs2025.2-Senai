// Fábricas de entidades de teste — campos conferidos contra os models reais
// (src/models/*.js) em 2026-06-30. Sempre que os models forem alterados,
// revisar estas fábricas.

const createUser = (overrides = {}) => ({
  id: 1,
  username: 'João Teste',
  email: 'joao@teste.com',
  password: '$2b$10$hashedpassword', // hash bcrypt simulado
  role: 'admin',
  has_access: true,
  domain_id: 1,
  domain_name: 'Domínio Teste',
  created_at: new Date().toISOString(),
  ...overrides
});

const createDevice = (overrides = {}) => ({
  id: 1,
  name: 'ESP32 Sala',
  mqtt_broker: 'broker.hivemq.com',
  mqtt_port: '1883',
  mqtt_topic: 'sensors/esp32/01',
  mqtt_username: null,
  mqtt_password: null,
  domain_id: 1,
  created_at: new Date().toISOString(),
  ...overrides
});

// Domain.findById / findByCode fazem LEFT JOIN com `plans` e
// `domain_telegram_configs`, então os campos do plano e do Telegram já
// chegam "achatados" no objeto de domínio.
const createDomain = (overrides = {}) => ({
  id: 1,
  name: 'Empresa Teste',
  code: 'EMP01',
  admin_id: 1,
  plan: 'gratuito',
  max_users: 10,
  max_devices: 5,
  telegram_chat_id: null,
  telegram_chat_name: null,
  telegram_enabled: false,
  telegram_verification_code: null,
  telegram_verification_expires_at: null,
  created_at: new Date().toISOString(),
  ...overrides
});

// AccessRequest.findById faz JOIN com users e devices, incluindo
// user_domain_id (domínio do solicitante) — usado pelo controller para
// garantir que a solicitação pertence ao domínio do admin que está agindo.
const createAccessRequest = (overrides = {}) => ({
  id: 1,
  user_id: 2,
  device_id: 1,
  username: 'Maria Usuária',
  email: 'maria@teste.com',
  device_name: 'ESP32 Sala',
  user_domain_id: 1,
  message: 'Preciso monitorar a sala',
  status: 'pending',
  created_at: new Date().toISOString(),
  ...overrides
});

const createWidget = (overrides = {}) => ({
  id: 1,
  name: 'Temperatura',
  type: 'line',
  device_id: 1,
  config: { field: 'temperature', unit: '°C' },
  position: { x: 0, y: 0, w: 6, h: 4 },
  created_at: new Date().toISOString(),
  ...overrides
});

module.exports = {
  createUser,
  createDevice,
  createDomain,
  createAccessRequest,
  createWidget
};
