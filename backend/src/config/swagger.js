const swaggerJsdoc = require('swagger-jsdoc');
const { zodToJsonSchema } = require('zod-to-json-schema');

const { loginSchema, registerSchema } = require('../schemas/auth.schema');
const { createDeviceSchema, updateDeviceSchema } = require('../schemas/device.schema');
const { createWidgetSchema, updateWidgetSchema } = require('../schemas/widget.schema');

/**
 * Converte um schema Zod para JSON Schema compatível com OpenAPI 3.
 * Remove a chave $schema que o conversor injeta por padrão.
 */
function fromZod(zodSchema) {
  const { $schema, ...rest } = zodToJsonSchema(zodSchema, {
    $refStrategy: 'none',
    target: 'openApi3'
  });
  return rest;
}

// ─── Schemas derivados do Zod ────────────────────────────────────────────────

const LoginRequest = {
  ...fromZod(loginSchema),
  description: 'Credenciais de autenticação. `domainCode` é obrigatório para todos os usuários.',
  required: [...(fromZod(loginSchema).required || []), 'domainCode'],
  properties: {
    ...fromZod(loginSchema).properties,
    domainCode: {
      type: 'string',
      description: 'Código único do domínio ao qual o usuário pertence.',
      example: 'EMP01'
    }
  },
  example: {
    email: 'joao@empresa.com',
    password: 'senha123',
    domainCode: 'EMP01'
  }
};

const RegisterRequest = {
  ...fromZod(registerSchema),
  description: 'Dados para criação de conta. O fluxo varia conforme `isManager`.',
  properties: {
    ...fromZod(registerSchema).properties,
    isManager: {
      type: 'boolean',
      description: 'Se `true`, cria um domínio e o usuário torna-se admin dele. Se `false`, o usuário ingressa em um domínio existente.',
      default: false
    },
    domainName: {
      type: 'string',
      description: 'Nome do novo domínio. Obrigatório quando `isManager = true`.',
      example: 'Empresa ABC'
    },
    domainCode: {
      type: 'string',
      description: 'Para gerente: código único do domínio a ser criado. Para usuário: código do domínio existente que deseja ingressar.',
      example: 'ABC01'
    },
    requestedDevices: {
      type: 'array',
      items: { type: 'integer' },
      description: 'IDs dos dispositivos que o usuário solicita acesso durante o cadastro (apenas para `isManager = false`).',
      example: [1, 2]
    }
  }
};

const CreateDeviceRequest = {
  ...fromZod(createDeviceSchema),
  description: 'Dados para criação de um dispositivo IoT. O device herda automaticamente o domínio do admin que o criou.',
  properties: {
    ...fromZod(createDeviceSchema).properties,
    mqttBroker: {
      ...fromZod(createDeviceSchema).properties.mqttBroker,
      example: 'broker.hivemq.com'
    },
    mqttPort: {
      ...fromZod(createDeviceSchema).properties.mqttPort,
      example: '1883'
    },
    mqttTopic: {
      ...fromZod(createDeviceSchema).properties.mqttTopic,
      example: 'sensors/esp32/01'
    }
  }
};

const UpdateDeviceRequest = {
  ...fromZod(updateDeviceSchema),
  description: 'Campos a atualizar no dispositivo. Todos são opcionais (PATCH semântico via PUT).'
};

const CreateWidgetRequest = {
  ...fromZod(createWidgetSchema),
  description: 'Dados para criação de um widget vinculado a um dispositivo.',
  properties: {
    ...fromZod(createWidgetSchema).properties,
    type: {
      ...fromZod(createWidgetSchema).properties.type,
      enum: ['chart', 'gauge', 'table', 'card', 'map', 'line', 'bar', 'pie', 'doughnut'],
      example: 'line'
    },
    deviceId: {
      ...fromZod(createWidgetSchema).properties.deviceId,
      example: 1
    }
  }
};

const UpdateWidgetRequest = {
  ...fromZod(updateWidgetSchema),
  description: 'Campos a atualizar no widget. Todos são opcionais.'
};

// ─── Schemas de resposta (definidos manualmente — não há Zod para respostas) ─

const UserSchema = {
  type: 'object',
  description: 'Representação pública de um usuário (sem o campo `password`).',
  properties: {
    id:        { type: 'integer', example: 1 },
    username:  { type: 'string',  example: 'João Silva' },
    email:     { type: 'string',  format: 'email', example: 'joao@empresa.com' },
    role:      { type: 'string',  enum: ['admin', 'user'], example: 'user' },
    hasAccess: { type: 'boolean', description: 'Indica se o usuário possui acesso liberado ao sistema.', example: true },
    domainId:  { type: 'integer', nullable: true, example: 3 },
    createdAt: { type: 'string',  format: 'date-time', example: '2025-03-15T14:30:00.000Z' }
  }
};

const DeviceSchema = {
  type: 'object',
  description: 'Representação pública de um dispositivo IoT.',
  properties: {
    id:           { type: 'integer', example: 1 },
    name:         { type: 'string',  example: 'Sensor Sala 01' },
    mqttBroker:   { type: 'string',  example: 'broker.hivemq.com' },
    mqttPort:     { type: 'string',  example: '1883' },
    mqttTopic:    { type: 'string',  example: 'sensors/esp32/01' },
    mqttUsername: { type: 'string',  nullable: true, example: 'esp32user' },
    mqttPassword: { type: 'string',  nullable: true, example: '••••••' },
    domainId:     { type: 'integer', nullable: true, example: 3 },
    createdAt:    { type: 'string',  format: 'date-time', example: '2025-03-15T14:30:00.000Z' }
  }
};

const WidgetSchema = {
  type: 'object',
  description: 'Representação pública de um widget de visualização.',
  properties: {
    id:        { type: 'integer', example: 1 },
    name:      { type: 'string',  example: 'Temperatura em tempo real' },
    type:      { type: 'string',  enum: ['chart', 'gauge', 'table', 'card', 'map', 'line', 'bar', 'pie', 'doughnut'], example: 'line' },
    deviceId:  { type: 'integer', example: 1 },
    config:    { type: 'object',  description: 'Configuração do widget (campos livres por tipo).', example: { field: 'temperature', unit: '°C', color: '#4CAF50' } },
    position:  { type: 'object',  description: 'Posição/tamanho no grid do dashboard.', example: { x: 0, y: 0, w: 6, h: 4 } },
    createdAt: { type: 'string',  format: 'date-time', example: '2025-03-15T14:30:00.000Z' }
  }
};

const DomainSchema = {
  type: 'object',
  description: 'Representa um domínio (tenant) do sistema.',
  properties: {
    id:        { type: 'integer', example: 1 },
    name:      { type: 'string',  example: 'Empresa ABC' },
    code:      { type: 'string',  description: 'Código único de identificação do domínio.', example: 'ABC01' },
    adminId:   { type: 'integer', nullable: true, description: 'ID do usuário admin responsável pelo domínio.', example: 5 },
    createdAt: { type: 'string',  format: 'date-time', example: '2025-03-15T14:30:00.000Z' }
  }
};

const AccessRequestSchema = {
  type: 'object',
  description: 'Solicitação de acesso de um usuário a um dispositivo (ou ao sistema em geral).',
  properties: {
    id:         { type: 'integer', example: 1 },
    userId:     { type: 'integer', example: 7 },
    username:   { type: 'string',  example: 'João Silva' },
    email:      { type: 'string',  format: 'email', example: 'joao@empresa.com' },
    deviceId:   { type: 'integer', nullable: true, description: '`null` representa uma solicitação de acesso geral ao sistema.', example: 2 },
    deviceName: { type: 'string',  nullable: true, example: 'Sensor Sala 01' },
    message:    { type: 'string',  nullable: true, example: 'Preciso acompanhar os dados deste sensor.' },
    status:     { type: 'string',  enum: ['pending', 'approved', 'rejected'], example: 'pending' },
    createdAt:  { type: 'string',  format: 'date-time', example: '2025-03-15T14:30:00.000Z' }
  }
};

const MqttDataSchema = {
  type: 'object',
  description: 'Registro de dado recebido via MQTT de um dispositivo.',
  properties: {
    id:         { type: 'integer', example: 1 },
    deviceId:   { type: 'integer', example: 1 },
    topic:      { type: 'string',  example: 'sensors/esp32/01' },
    payload:    { type: 'object',  description: 'Payload JSON do sensor.', example: { temperature: 23.5, humidity: 60.1 } },
    receivedAt: { type: 'string',  format: 'date-time', example: '2025-03-15T14:30:00.000Z' },
    Data:       { type: 'string',  description: 'Data formatada no fuso de Brasília (gerada pela query SQL).', example: '15/03/2025' },
    Hora:       { type: 'string',  description: 'Hora formatada no fuso de Brasília (gerada pela query SQL).', example: '11:30:00' }
  }
};

const ErrorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error:   { type: 'string',  example: 'Mensagem de erro' }
  },
  required: ['success', 'error']
};

const ValidationError = {
  type: 'object',
  description: 'Erro de validação retornado pelo middleware Zod.',
  properties: {
    success: { type: 'boolean', example: false },
    error:   { type: 'string',  example: 'Dados inválidos' },
    details: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field:   { type: 'string', example: 'email' },
          message: { type: 'string', example: 'E-mail inválido' }
        }
      }
    }
  },
  required: ['success', 'error', 'details']
};

// ─── Configuração swagger-jsdoc ───────────────────────────────────────────────

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CleanAir IoT Dashboard API',
      version: '1.0.0',
      description: [
        'API REST para o sistema **CleanAir** — dashboard IoT de monitoramento ambiental.',
        '',
        '## Autenticação',
        'A maioria dos endpoints requer um token JWT obtido em `POST /api/auth/login`.',
        'Envie o token no header: `Authorization: Bearer <token>`.',
        '',
        '## Papéis (RBAC)',
        '| Role | Descrição |',
        '|------|-----------|',
        '| `admin` | Administrador de domínio — gerencia devices, widgets e aprova solicitações. |',
        '| `user`  | Usuário final — visualiza apenas os devices e widgets que lhe foram atribuídos. |',
        '',
        '## Domínios (multi-tenancy)',
        'O sistema é multi-tenant por domínio. Ao se registrar como gerente, um domínio é criado com um código único.',
        'Usuários se cadastram informando esse código. Todo usuário pertence a exatamente um domínio e o isolamento entre domínios é garantido em todos os endpoints.'
      ].join('\n')
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Desenvolvimento local'
      }
    ],
    tags: [
      { name: 'Health',   description: 'Verificação de disponibilidade da API' },
      { name: 'Auth',     description: 'Registro, login e dados do usuário autenticado' },
      { name: 'Users',    description: 'Gerenciamento de usuários (requer admin)' },
      { name: 'Devices',  description: 'Gerenciamento de dispositivos IoT' },
      { name: 'Widgets',  description: 'Gerenciamento de widgets de visualização' },
      { name: 'Access',   description: 'Solicitações de acesso a dispositivos' },
      { name: 'MQTT',     description: 'Dados e controle de conexões MQTT' },
      { name: 'Domains',  description: 'Domínios (tenants) do sistema' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido via `POST /api/auth/login`. Expira em 24h por padrão.'
        }
      },
      schemas: {
        // ── Requests derivados do Zod ──────────────────────────────────────
        LoginRequest,
        RegisterRequest,
        CreateDeviceRequest,
        UpdateDeviceRequest,
        CreateWidgetRequest,
        UpdateWidgetRequest,
        // ── Responses definidos manualmente ───────────────────────────────
        User:           UserSchema,
        Device:         DeviceSchema,
        Widget:         WidgetSchema,
        Domain:         DomainSchema,
        AccessRequest:  AccessRequestSchema,
        MqttData:       MqttDataSchema,
        // ── Respostas de erro ──────────────────────────────────────────────
        ErrorResponse,
        ValidationError
      }
    }
  },
  // Caminhos onde swagger-jsdoc buscará anotações @swagger
  apis: [
    `${__dirname}/../routes/*.routes.js`
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
