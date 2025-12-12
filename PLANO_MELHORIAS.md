# 🚀 Plano de Melhorias - IoT Dashboard

**Data:** 09 de Dezembro de 2025  
**Projeto:** Sistema de Monitoramento IoT em Tempo Real  
**Status:** Proposta de Melhorias

---

## 📋 Índice

1. [Segurança (Prioridade CRÍTICA)](#1-segurança-prioridade-crítica)
2. [Logging e Monitoramento](#2-logging-e-monitoramento)
3. [Gestão de Estado e Performance](#3-gestão-de-estado-e-performance)
4. [Banco de Dados](#4-banco-de-dados)
5. [Testes Automatizados](#5-testes-automatizados)
6. [Variáveis de Ambiente](#6-variáveis-de-ambiente)
7. [Tratamento de Erros](#7-tratamento-de-erros)
8. [MQTT - Melhorias](#8-mqtt---melhorias)
9. [Frontend - Melhorias](#9-frontend---melhorias)
10. [Rate Limiting](#10-rate-limiting)
11. [Docker & CI/CD](#11-docker--cicd)
12. [Plano de Ação](#12-plano-de-ação)

---

## 🔒 1. SEGURANÇA (Prioridade CRÍTICA)

### ❌ Problema 1.1: JWT Secret padrão em produção

**Localização:** `backend/src/services/token.service.js`

**Código Atual:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';
```

**Risco:** 🔴 CRÍTICO - Secret padrão pode ser explorado em produção

**✅ Solução:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ ERRO CRÍTICO: JWT_SECRET não configurado!');
  console.error('Configure JWT_SECRET no arquivo .env');
  process.exit(1);
}
```

**Impacto:** Alto | **Esforço:** Baixo | **Prioridade:** 🔴 CRÍTICA

---

### ❌ Problema 1.2: WebSocket sem autenticação

**Localização:** `backend/src/index.js`

**Risco:** 🔴 CRÍTICO - Qualquer cliente pode se conectar e receber dados sensíveis

**✅ Solução: Implementar autenticação JWT no WebSocket**

**Backend:**
```javascript
// backend/src/index.js
const { verifyToken } = require('./services/token.service');

// Middleware de autenticação para Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Autenticação necessária'));
  }
  
  try {
    const decoded = verifyToken(token);
    socket.user = decoded; // Anexa dados do usuário ao socket
    next();
  } catch (error) {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Usuário ${socket.user.email} conectado`);
  
  // Verificar permissões antes de inscrever em dispositivo
  socket.on('subscribe:device', async (deviceId) => {
    // Verificar se usuário tem acesso ao dispositivo
    const hasAccess = await checkUserDeviceAccess(socket.user.id, deviceId);
    
    if (!hasAccess) {
      socket.emit('error', { message: 'Sem permissão para este dispositivo' });
      return;
    }
    
    socket.join(`device:${deviceId}`);
    console.log(`[WebSocket] Usuário ${socket.user.email} inscrito no device:${deviceId}`);
  });
});
```

**Frontend:**
```javascript
// frontend/teste-mcp/src/components/DashboardPage/DashboardPage.js
const token = localStorage.getItem('token');
const socket = io('http://localhost:3001', {
  autoConnect: false,
  auth: { token } // Enviar token na autenticação
});

// Tratar erros de autenticação
socket.on('connect_error', (error) => {
  console.error('Erro de conexão:', error.message);
  if (error.message === 'Token inválido') {
    // Redirecionar para login
    window.location.href = '/login';
  }
});
```

**Impacto:** Alto | **Esforço:** Médio | **Prioridade:** 🔴 CRÍTICA

---

### ❌ Problema 1.3: Senhas e dados sensíveis em logs

**Localização:** `backend/src/services/mqtt.service.js`

**Risco:** 🟡 MÉDIO - Logs podem expor informações sensíveis

**✅ Solução:**
```javascript
// Evitar logar payloads completos em produção
if (process.env.NODE_ENV !== 'production') {
  console.log(`[MQTT] Payload: ${payload}`);
}

// Ou sanitizar logs
const sanitizedPayload = sanitizeForLog(payload);
logger.info(`[MQTT] Dados recebidos`, { deviceId: id, topic });
```

**Impacto:** Médio | **Esforço:** Baixo | **Prioridade:** 🟡 ALTA

---

## 📊 2. LOGGING E MONITORAMENTO

### ✅ Implementar sistema de logs profissional com Winston

**Instalação:**
```bash
cd backend
npm install winston --save
```

**Criar arquivo de configuração:**

**`backend/src/utils/logger.js`**
```javascript
const winston = require('winston');
const path = require('path');

// Formatos customizados
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Criar diretório de logs se não existir
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'iot-dashboard' },
  transports: [
    // Erros em arquivo separado
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Todos os logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

module.exports = logger;
```

**Uso em todo o projeto:**

**Substituir:**
```javascript
console.log('Mensagem');
console.error('Erro');
```

**Por:**
```javascript
const logger = require('./utils/logger');

logger.info('Mensagem');
logger.error('Erro', { error: err.message, stack: err.stack });
logger.warn('Aviso');
logger.debug('Debug info');
```

**Benefícios:**
- ✅ Logs estruturados em JSON
- ✅ Rotação automática de arquivos
- ✅ Níveis de log configuráveis
- ✅ Facilita debugging e auditoria
- ✅ Integração com ferramentas de monitoramento (ELK Stack, Datadog)

**Impacto:** Alto | **Esforço:** Médio | **Prioridade:** 🟡 ALTA

---

## 🔄 3. GESTÃO DE ESTADO E PERFORMANCE

### ❌ Problema 3.1: Socket criado globalmente

**Localização:** `frontend/teste-mcp/src/components/DashboardPage/DashboardPage.js`

**Código Atual:**
```javascript
const socket = io('http://localhost:3001', { autoConnect: false });
```

**Problema:** Socket global dificulta reutilização e gerenciamento de estado

**✅ Solução: Context API para compartilhar socket**

**`frontend/src/contexts/SocketContext.js`**
```javascript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    const newSocket = io(apiUrl, {
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    newSocket.on('connect', () => {
      console.log('🔌 WebSocket conectado');
      setConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado');
      setConnected(false);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Erro de conexão:', error);
      if (error.message === 'Token inválido') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, []);
  
  const subscribeToDevice = (deviceId) => {
    if (socket && connected) {
      socket.emit('subscribe:device', deviceId);
    }
  };
  
  const unsubscribeFromDevice = (deviceId) => {
    if (socket && connected) {
      socket.emit('unsubscribe:device', deviceId);
    }
  };
  
  return (
    <SocketContext.Provider value={{ 
      socket, 
      connected, 
      subscribeToDevice, 
      unsubscribeFromDevice 
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de SocketProvider');
  }
  return context;
};
```

**Usar no App.js:**
```javascript
import { SocketProvider } from './contexts/SocketContext';

function App() {
  return (
    <SocketProvider>
      {/* Resto da aplicação */}
    </SocketProvider>
  );
}
```

**Usar em componentes:**
```javascript
import { useSocket } from '../../contexts/SocketContext';

const DashboardPage = () => {
  const { socket, connected, subscribeToDevice } = useSocket();
  
  useEffect(() => {
    if (deviceId) {
      subscribeToDevice(deviceId);
    }
  }, [deviceId]);
  
  // ...
};
```

**Impacto:** Médio | **Esforço:** Médio | **Prioridade:** 🟢 MÉDIA

---

## 💾 4. BANCO DE DADOS

### ❌ Problema 4.1: SQLite em memória com persistência manual

**Código Atual:** `backend/src/config/database.js`
```javascript
saveDatabase(); // Chamado após cada operação
```

**Limitações:**
- ❌ Performance baixa em escala
- ❌ Concorrência limitada
- ❌ Backup manual

### ✅ Melhorias Imediatas (SQLite)

**1. Adicionar índices para performance:**
```javascript
// backend/src/config/database.js
async function initDatabase() {
  // ... código existente ...
  
  // Criar índices para queries frequentes
  await run(`CREATE INDEX IF NOT EXISTS idx_mqtt_data_device_id 
             ON mqtt_data(device_id)`);
  
  await run(`CREATE INDEX IF NOT EXISTS idx_mqtt_data_timestamp 
             ON mqtt_data(received_at DESC)`);
  
  await run(`CREATE INDEX IF NOT EXISTS idx_mqtt_data_device_timestamp 
             ON mqtt_data(device_id, received_at DESC)`);
  
  await run(`CREATE INDEX IF NOT EXISTS idx_devices_user_id 
             ON devices(user_id)`);
  
  console.log('✅ Índices criados com sucesso');
}
```

**2. Usar modo WAL (Write-Ahead Logging):**
```javascript
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');
```

**Impacto:** Médio | **Esforço:** Baixo | **Prioridade:** 🟢 MÉDIA

---

### ✅ Migração Futura: PostgreSQL

**Quando migrar para produção:**

**Instalação:**
```bash
npm install pg sequelize --save
```

**`backend/src/config/database.postgres.js`**
```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'iot_dashboard',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
```

**Impacto:** Médio | **Esforço:** Alto | **Prioridade:** 🔵 BAIXA (futuro)

---

## 🧪 5. TESTES AUTOMATIZADOS

### ❌ Problema: Zero cobertura de testes

**✅ Solução: Implementar testes unitários e de integração**

**Instalação:**
```bash
cd backend
npm install --save-dev jest supertest @types/jest

cd ../frontend/teste-mcp
# @testing-library já instalado
```

**Configurar Jest no backend:**

**`backend/package.json`**
```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"],
    "testMatch": ["**/__tests__/**/*.test.js"]
  }
}
```

---

### Exemplos de Testes

**`backend/src/__tests__/auth.test.js`**
```javascript
const request = require('supertest');
const app = require('../index');

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    test('deve retornar token com credenciais válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'admin@admin.com', 
          password: 'admin123' 
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('admin@admin.com');
    });
    
    test('deve retornar erro com senha inválida', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'admin@admin.com', 
          password: 'senhaerrada' 
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
```

**`backend/src/__tests__/mqtt.test.js`**
```javascript
const MqttService = require('../services/mqtt.service');

describe('MQTT Service', () => {
  test('deve conectar a um broker MQTT', () => {
    const device = {
      id: 1,
      mqtt_broker: 'broker.hivemq.com',
      mqtt_port: 1883,
      mqtt_topic: 'test/topic'
    };
    
    const client = MqttService.connect(device);
    expect(client).toBeDefined();
  });
  
  test('deve salvar dados no banco', () => {
    const deviceId = 1;
    const topic = 'test/topic';
    const payload = JSON.stringify({ temperature: 25 });
    
    expect(() => {
      MqttService.saveData(deviceId, topic, payload);
    }).not.toThrow();
  });
});
```

**`frontend/teste-mcp/src/components/DashboardPage/DashboardPage.test.js`**
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  test('renderiza mensagem de boas-vindas', () => {
    render(
      <DashboardPage 
        username="Teste" 
        deviceName="Device 1"
        widgets={[]}
      />
    );
    
    expect(screen.getByText(/Bem Vindo Teste/i)).toBeInTheDocument();
  });
  
  test('mostra mensagem quando não há widgets', () => {
    render(
      <DashboardPage 
        username="Teste"
        widgets={[]}
      />
    );
    
    expect(screen.getByText(/Nenhum gráfico configurado/i)).toBeInTheDocument();
  });
});
```

**Impacto:** Alto | **Esforço:** Alto | **Prioridade:** 🟢 MÉDIA

---

## 🌐 6. VARIÁVEIS DE AMBIENTE

### ❌ Problema: URLs e configurações hardcoded

**Localizações:**
- `frontend/src/services/api.js`: `const API_URL = 'http://localhost:3001/api'`
- `frontend/src/components/DashboardPage/DashboardPage.js`: `const socket = io('http://localhost:3001')`

**✅ Solução: Centralizar configurações**

---

### Backend

**`backend/.env.example`**
```env
# Servidor
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=sua_chave_super_secreta_mude_em_producao
JWT_EXPIRES_IN=24h

# MQTT
MQTT_RECONNECT_PERIOD=5000
MQTT_KEEPALIVE=60

# Logs
LOG_LEVEL=debug

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002,http://localhost:3003

# Banco de Dados (futuro PostgreSQL)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=iot_dashboard
# DB_USER=postgres
# DB_PASSWORD=
```

**`backend/.env`** (gitignore)
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=dev_secret_change_in_production_12345
JWT_EXPIRES_IN=24h
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
```

---

### Frontend

**`frontend/teste-mcp/.env.development`**
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=http://localhost:3001
REACT_APP_ENV=development
```

**`frontend/teste-mcp/.env.production`**
```env
REACT_APP_API_URL=https://api.seudominio.com
REACT_APP_WS_URL=https://api.seudominio.com
REACT_APP_ENV=production
```

**`frontend/teste-mcp/src/config/constants.js`**
```javascript
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';
export const IS_PRODUCTION = process.env.REACT_APP_ENV === 'production';

export const APP_CONFIG = {
  API_TIMEOUT: 30000,
  WS_RECONNECT_ATTEMPTS: 5,
  WS_RECONNECT_DELAY: 1000,
  CHART_UPDATE_INTERVAL: 100,
  MAX_DATA_POINTS: 20
};
```

**Usar em arquivos:**

**`frontend/teste-mcp/src/services/api.js`**
```javascript
import { API_URL } from '../config/constants';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000
});
```

**`frontend/teste-mcp/src/contexts/SocketContext.js`**
```javascript
import { WS_URL, APP_CONFIG } from '../config/constants';

const newSocket = io(WS_URL, {
  reconnectionAttempts: APP_CONFIG.WS_RECONNECT_ATTEMPTS,
  reconnectionDelay: APP_CONFIG.WS_RECONNECT_DELAY
});
```

**Impacto:** Médio | **Esforço:** Baixo | **Prioridade:** 🟡 ALTA

---

## 🔧 7. TRATAMENTO DE ERROS

### ❌ Problema: Erros genéricos sem contexto

**Código Atual:** `backend/src/index.js`
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Erro interno do servidor' });
});
```

**✅ Solução: Sistema de erros customizados**

---

### Criar classes de erro

**`backend/src/utils/errors.js`**
```javascript
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Dados inválidos', errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
};
```

---

### Middleware de erro melhorado

**`backend/src/middleware/error.middleware.js`**
```javascript
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  let error = err;
  
  // Se não for AppError, criar um
  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro interno do servidor';
    error = new AppError(message, statusCode);
  }
  
  // Log do erro
  const logData = {
    message: error.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  };
  
  if (error.statusCode >= 500) {
    logger.error('Erro no servidor', { ...logData, stack: error.stack });
  } else {
    logger.warn('Erro de cliente', logData);
  }
  
  // Resposta ao cliente
  const response = {
    success: false,
    error: error.message,
    statusCode: error.statusCode
  };
  
  // Incluir detalhes adicionais em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    if (error.errors) {
      response.errors = error.errors;
    }
  }
  
  res.status(error.statusCode).json(response);
}

// Middleware para rotas não encontradas
function notFoundHandler(req, res, next) {
  const error = new AppError(`Rota ${req.path} não encontrada`, 404);
  next(error);
}

module.exports = { errorHandler, notFoundHandler };
```

---

### Usar em controllers

**Exemplo:**
```javascript
const { NotFoundError, UnauthorizedError } = require('../utils/errors');

async function getDevice(req, res, next) {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      throw new NotFoundError('Dispositivo não encontrado');
    }
    
    // Verificar permissão
    if (device.user_id !== req.user.id) {
      throw new UnauthorizedError('Sem permissão para acessar este dispositivo');
    }
    
    res.json({ success: true, data: device });
  } catch (error) {
    next(error); // Passa para errorHandler
  }
}
```

---

### Atualizar index.js

**`backend/src/index.js`**
```javascript
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// ... rotas ...

// Middleware de erro (sempre por último)
app.use(notFoundHandler);
app.use(errorHandler);
```

**Impacto:** Alto | **Esforço:** Médio | **Prioridade:** 🟡 ALTA

---

## 📡 8. MQTT - MELHORIAS

### ✅ 8.1 Reconexão automática aprimorada

**`backend/src/services/mqtt.service.js`**
```javascript
const options = {
  clientId: `iot_dashboard_${id}_${Date.now()}`,
  clean: true,
  reconnectPeriod: 5000,
  keepalive: 60,
  // Adicionar:
  connectTimeout: 30000,
  resubscribe: true,
  queueQoSZero: false,
  will: {
    topic: `devices/${id}/status`,
    payload: 'offline',
    qos: 1,
    retain: true
  }
};

// Eventos adicionais
client.on('reconnect', () => {
  logger.warn(`[MQTT] Tentando reconectar device ${id}...`);
});

client.on('offline', () => {
  logger.error(`[MQTT] Device ${id} offline!`);
  // Notificar admin via WebSocket
  if (io) {
    io.to(`admin`).emit('device:offline', { deviceId: id });
  }
});

client.on('end', () => {
  logger.info(`[MQTT] Conexão device ${id} encerrada`);
});
```

---

### ✅ 8.2 Validação de payload

```javascript
client.on('message', (topic, message) => {
  try {
    const payload = message.toString();
    const timestamp = new Date().toISOString();
    
    // Validar se é JSON válido
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payload);
    } catch (e) {
      logger.warn(`[MQTT] Device ${id}: Payload não é JSON válido`, { payload });
      parsedPayload = { raw: payload };
    }
    
    // Validar estrutura esperada (opcional)
    const expectedFields = ['temperature', 'humidity', 'pressure'];
    const hasValidField = expectedFields.some(field => field in parsedPayload);
    
    if (!hasValidField) {
      logger.warn(`[MQTT] Device ${id}: Payload sem campos esperados`, {
        received: Object.keys(parsedPayload),
        expected: expectedFields
      });
    }
    
    // Log controlado (não em produção)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[MQTT] 📥 MENSAGEM RECEBIDA!`);
      console.log(`[MQTT] Device ID: ${id}`);
      console.log(`[MQTT] Tópico: ${topic}`);
      console.log(`[MQTT] Payload:`, parsedPayload);
    }
    
    // Salvar no cache
    latestData.set(topic, {
      payload,
      parsedPayload,
      timestamp
    });

    // Salvar no banco
    this.saveData(id, topic, payload);
    
    // Emitir via WebSocket
    if (io) {
      io.to(`device:${id}`).emit('mqtt:data', {
        deviceId: id,
        topic,
        payload,
        timestamp
      });
      logger.debug(`[MQTT] Dados enviados via WebSocket para device:${id}`);
    }
  } catch (error) {
    logger.error('[MQTT] Erro ao processar mensagem:', {
      error: error.message,
      deviceId: id,
      stack: error.stack
    });
  }
});
```

---

### ✅ 8.3 Health check de conexões MQTT

**`backend/src/routes/mqtt.routes.js`**
```javascript
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const devices = Device.findAll();
    const status = devices.map(device => ({
      id: device.id,
      name: device.name,
      connected: MqttService.isConnected(device.id),
      broker: device.mqtt_broker,
      topic: device.mqtt_topic
    }));
    
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Impacto:** Médio | **Esforço:** Baixo | **Prioridade:** 🟢 MÉDIA

---

## 🎨 9. FRONTEND - MELHORIAS

### ✅ 9.1 Loading states e feedback visual

**`frontend/teste-mcp/src/components/DashboardPage/DashboardPage.js`**
```javascript
const DynamicWidget = ({ widget, deviceId, onDownload }) => {
  const [mqttData, setMqttData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket, connected } = useSocket();
  
  // Buscar dados iniciais
  const fetchInitialData = useCallback(async () => {
    if (!deviceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await mqttApi.getData(deviceId, { limit: 20 });
      if (response.success && response.data && response.data.length > 0) {
        setMqttData(response.data);
      }
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);
  
  // Render condicional
  if (loading) {
    return (
      <div className="widget-loading">
        <div className="spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="widget-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={fetchInitialData}>Tentar novamente</button>
      </div>
    );
  }
  
  if (!mqttData || mqttData.length === 0) {
    return (
      <div className="widget-empty">
        <span className="empty-icon">📊</span>
        <p>Aguardando dados do sensor...</p>
      </div>
    );
  }
  
  return (
    <div className="widget">
      {/* Indicador de conexão WebSocket */}
      {!connected && (
        <div className="connection-warning">
          ⚠️ Desconectado do servidor - Reconectando...
        </div>
      )}
      
      {/* Gráfico */}
      <div className="chart-header">
        <h3 className="chart-title">
          {widget.name || widget.title || 'Gráfico'}
        </h3>
        <button 
          className="chart-download-btn"
          onClick={() => onDownload && onDownload(widget.type)}
          title="Download Excel"
        >
          <img src={excelIcon} alt="Excel" className="excel-icon-small" />
        </button>
      </div>
      <div className="chart-wrapper">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};
```

**CSS para loading/error:**

**`frontend/teste-mcp/src/components/DashboardPage/DashboardPage.css`**
```css
.widget-loading,
.widget-error,
.widget-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.widget-error {
  color: #e74c3c;
}

.error-icon,
.empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.widget-error button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.connection-warning {
  background-color: #fff3cd;
  color: #856404;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 10px;
  text-align: center;
  border: 1px solid #ffeaa7;
}
```

---

### ✅ 9.2 Debounce para atualizações de gráfico

**Instalação:**
```bash
cd frontend/teste-mcp
npm install lodash.debounce --save
```

**Uso:**
```javascript
import debounce from 'lodash.debounce';

const DynamicWidget = ({ widget, deviceId, onDownload }) => {
  // ... estado ...
  
  // Função de atualização com debounce
  const updateChart = useCallback(
    debounce((newData) => {
      if (chartInstance.current && newData.length > 0) {
        // Atualizar dados do gráfico
        const config = typeof widget.config === 'string' 
          ? JSON.parse(widget.config) 
          : widget.config;
        
        // Processar dados para o gráfico
        const chartData = processDataForChart(newData, config);
        
        chartInstance.current.data = chartData;
        chartInstance.current.update('none'); // sem animação para melhor performance
      }
    }, 100), // Atualiza no máximo a cada 100ms
    [widget]
  );
  
  // Usar no listener WebSocket
  useEffect(() => {
    if (!deviceId) return;
    
    const handleMqttData = (data) => {
      if (data.deviceId === deviceId) {
        setMqttData((prevData) => {
          const newData = [{
            id: Date.now(),
            device_id: data.deviceId,
            topic: data.topic,
            payload: data.payload,
            timestamp: data.timestamp,
            received_at: data.timestamp
          }, ...prevData].slice(0, 20);
          
          // Atualizar gráfico com debounce
          updateChart(newData);
          
          return newData;
        });
      }
    };
    
    socket.on('mqtt:data', handleMqttData);
    
    return () => {
      socket.off('mqtt:data', handleMqttData);
    };
  }, [deviceId, socket, updateChart]);
};
```

---

### ✅ 9.3 Notificações Toast

**Instalação:**
```bash
npm install react-hot-toast --save
```

**Uso:**
```javascript
import toast, { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      {/* Resto da aplicação */}
    </>
  );
}

// Em componentes
toast.success('Conectado ao servidor!');
toast.error('Erro ao carregar dados');
toast.loading('Carregando...');
```

**Impacto:** Alto | **Esforço:** Baixo | **Prioridade:** 🟡 ALTA

---

## 🔐 10. RATE LIMITING

### ✅ Proteger APIs contra abuso

**Instalação:**
```bash
cd backend
npm install express-rate-limit --save
```

**`backend/src/middleware/rateLimit.middleware.js`**
```javascript
const rateLimit = require('express-rate-limit');

// Rate limiter geral para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Rate limiter específico para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // limite de 5 tentativas de login
  skipSuccessfulRequests: true, // Não conta login bem-sucedido
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  }
});

// Rate limiter para registro
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // limite de 3 registros por hora
  message: {
    success: false,
    error: 'Muitas tentativas de registro. Tente novamente em 1 hora.'
  }
});

module.exports = { apiLimiter, loginLimiter, registerLimiter };
```

**Usar em rotas:**

**`backend/src/index.js`**
```javascript
const { apiLimiter } = require('./middleware/rateLimit.middleware');

// Aplicar rate limiting a todas as rotas da API
app.use('/api/', apiLimiter);
```

**`backend/src/routes/auth.routes.js`**
```javascript
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit.middleware');

router.post('/login', loginLimiter, login);
router.post('/register', registerLimiter, register);
```

**Impacto:** Alto | **Esforço:** Baixo | **Prioridade:** 🟡 ALTA

---

## 📦 11. DOCKER & CI/CD

### ✅ 11.1 Dockerização do projeto

**`backend/Dockerfile`**
```dockerfile
FROM node:18-alpine

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar diretório para logs e banco de dados
RUN mkdir -p logs database

# Expor porta
EXPOSE 3001

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001

# Comando para iniciar
CMD ["node", "src/index.js"]
```

---

**`frontend/teste-mcp/Dockerfile`**
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copiar build para nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuração nginx customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**`frontend/teste-mcp/nginx.conf`**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Configurações de cache
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy para API (opcional)
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### ✅ 11.2 Docker Compose

**`docker-compose.yml`**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: iot-dashboard-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=24h
      - LOG_LEVEL=info
    volumes:
      - ./backend/database:/app/database
      - ./backend/logs:/app/logs
    restart: unless-stopped
    networks:
      - iot-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build: ./frontend/teste-mcp
    container_name: iot-dashboard-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - iot-network

networks:
  iot-network:
    driver: bridge
```

**`.env.docker`**
```env
JWT_SECRET=production_secret_change_this_to_random_string
```

**Comandos:**
```bash
# Build
docker-compose build

# Iniciar
docker-compose up -d

# Parar
docker-compose down

# Ver logs
docker-compose logs -f

# Rebuild após mudanças
docker-compose up -d --build
```

---

### ✅ 11.3 CI/CD com GitHub Actions

**`.github/workflows/ci.yml`**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      working-directory: ./backend
      run: npm ci
    
    - name: Run tests
      working-directory: ./backend
      run: npm test
    
    - name: Run linter
      working-directory: ./backend
      run: npm run lint || true

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/teste-mcp/package-lock.json
    
    - name: Install dependencies
      working-directory: ./frontend/teste-mcp
      run: npm ci
    
    - name: Run tests
      working-directory: ./frontend/teste-mcp
      run: npm test -- --watchAll=false
    
    - name: Build
      working-directory: ./frontend/teste-mcp
      run: npm run build

  docker-build:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Backend Docker Image
      run: docker build -t iot-dashboard-backend:latest ./backend
    
    - name: Build Frontend Docker Image
      run: docker build -t iot-dashboard-frontend:latest ./frontend/teste-mcp
```

**Impacto:** Baixo (Operacional) | **Esforço:** Médio | **Prioridade:** 🔵 BAIXA

---

## 📊 12. PLANO DE AÇÃO

### 🗓️ **SEMANA 1 - Segurança Crítica**

| Tarefa | Arquivo | Prioridade | Tempo |
|--------|---------|------------|-------|
| ✅ Validação JWT_SECRET obrigatória | `backend/src/services/token.service.js` | 🔴 CRÍTICA | 30min |
| ✅ Autenticação WebSocket | `backend/src/index.js` + Frontend | 🔴 CRÍTICA | 2h |
| ✅ Rate limiting | `backend/src/middleware/rateLimit.middleware.js` | 🟡 ALTA | 1h |
| ✅ Variáveis de ambiente | `.env`, `config/constants.js` | 🟡 ALTA | 1h |

**Total:** ~4.5 horas

---

### 🗓️ **SEMANA 2 - Logs e Erros**

| Tarefa | Arquivo | Prioridade | Tempo |
|--------|---------|------------|-------|
| ✅ Implementar Winston | `backend/src/utils/logger.js` | 🟡 ALTA | 2h |
| ✅ Sistema de erros customizados | `backend/src/utils/errors.js` | 🟡 ALTA | 1.5h |
| ✅ Middleware de erro | `backend/src/middleware/error.middleware.js` | 🟡 ALTA | 1h |
| ✅ Substituir console.log por logger | Todo o backend | 🟡 ALTA | 2h |
| ✅ Índices no banco | `backend/src/config/database.js` | 🟢 MÉDIA | 30min |

**Total:** ~7 horas

---

### 🗓️ **SEMANA 3 - Frontend e Testes**

| Tarefa | Arquivo | Prioridade | Tempo |
|--------|---------|------------|-------|
| ✅ Context API para Socket | `frontend/src/contexts/SocketContext.js` | 🟢 MÉDIA | 2h |
| ✅ Loading states | `DashboardPage.js` + CSS | 🟡 ALTA | 1.5h |
| ✅ Debounce em gráficos | `DashboardPage.js` | 🟢 MÉDIA | 1h |
| ✅ Testes backend básicos | `backend/src/__tests__/` | 🟢 MÉDIA | 3h |
| ✅ Testes frontend básicos | `frontend/src/__tests__/` | 🟢 MÉDIA | 2h |

**Total:** ~9.5 horas

---

### 🗓️ **SEMANA 4 - MQTT e Extras**

| Tarefa | Arquivo | Prioridade | Tempo |
|--------|---------|------------|-------|
| ✅ Melhorias MQTT | `backend/src/services/mqtt.service.js` | 🟢 MÉDIA | 2h |
| ✅ Notificações Toast | Frontend | 🟡 ALTA | 1h |
| ✅ Docker & Compose | `Dockerfile`, `docker-compose.yml` | 🔵 BAIXA | 2h |
| ✅ Documentação | `README.md` atualizado | 🟢 MÉDIA | 1h |

**Total:** ~6 horas

---

## 📈 MÉTRICAS DE SUCESSO

### Antes das Melhorias
- ❌ JWT Secret padrão
- ❌ WebSocket sem autenticação
- ❌ Zero testes
- ❌ Logs não estruturados
- ❌ Sem rate limiting
- ⚠️ URLs hardcoded

### Depois das Melhorias (Meta)
- ✅ JWT Secret obrigatório
- ✅ WebSocket autenticado
- ✅ Cobertura de testes > 60%
- ✅ Logs estruturados com Winston
- ✅ Rate limiting em todas as rotas críticas
- ✅ Configurações centralizadas
- ✅ Sistema de erros robusto
- ✅ Containerização com Docker
- ✅ Loading states e feedback visual

---

## 🎯 RESUMO EXECUTIVO

| Categoria | Itens | Tempo Total | Prioridade |
|-----------|-------|-------------|------------|
| **Segurança** | 4 melhorias | ~4.5h | 🔴 CRÍTICA |
| **Logs & Erros** | 5 melhorias | ~7h | 🟡 ALTA |
| **Frontend** | 5 melhorias | ~6.5h | 🟡 ALTA |
| **Testes** | 2 melhorias | ~5h | 🟢 MÉDIA |
| **MQTT** | 3 melhorias | ~2h | 🟢 MÉDIA |
| **DevOps** | 3 melhorias | ~3h | 🔵 BAIXA |

**Tempo Total Estimado:** ~28 horas (1 mês trabalhando 7h/semana)

---

## 📝 NOTAS FINAIS

### Recomendações de Prioridade

1. **🔴 IMEDIATO (Semana 1):**
   - JWT Secret obrigatório
   - Autenticação WebSocket
   - Rate limiting

2. **🟡 CURTO PRAZO (Semanas 2-3):**
   - Sistema de logs
   - Tratamento de erros
   - Loading states frontend

3. **🟢 MÉDIO PRAZO (Semana 4+):**
   - Testes automatizados
   - Context API
   - Melhorias MQTT

4. **🔵 LONGO PRAZO (Futuro):**
   - Docker/CI-CD
   - Migração PostgreSQL
   - Monitoramento avançado

---

## 🔗 RECURSOS ADICIONAIS

### Documentação
- [Winston Logger](https://github.com/winstonjs/winston)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [Socket.IO Authentication](https://socket.io/docs/v4/middlewares/)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Docker Compose](https://docs.docker.com/compose/)

### Ferramentas Recomendadas
- **Monitoramento:** PM2, Datadog, New Relic
- **Logs:** ELK Stack, Loki
- **CI/CD:** GitHub Actions, GitLab CI, Jenkins
- **Testes:** Jest, Supertest, Testing Library
- **Code Quality:** ESLint, Prettier, SonarQube

---

**Última Atualização:** 09/12/2025  
**Versão:** 1.0  
**Autor:** GitHub Copilot
