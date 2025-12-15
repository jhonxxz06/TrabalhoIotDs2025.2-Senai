# Prompt para Implementação do Backend

Implemente um backend Node.js/Express para um sistema de Dashboard IoT (mini ThingsBoard) que monitora sensores ESP32 via MQTT.

## Contexto do Projeto

O frontend React já está pronto em `d:\João Pedro\Desktop\mcpteste\frontend\teste-mcp\`. O backend deve ser criado em `d:\João Pedro\Desktop\mcpteste\backend\`.

O sistema tem dois tipos de usuários:
- **Admin**: CRUD completo de dispositivos, widgets, aprovar/rejeitar usuários
- **User**: Visualiza dispositivos atribuídos e dashboards com gráficos

## Estrutura do Backend

```
backend/
├── src/
│   ├── index.js                    # Entry point + Express setup
│   ├── config/
│   │   ├── database.js             # Configuração SQLite
│   │   └── mqtt.js                 # Configuração cliente MQTT
│   ├── middleware/
│   │   ├── auth.middleware.js      # Verificação JWT
│   │   ├── rbac.middleware.js      # Controle de roles (admin/user)
│   │   └── validate.middleware.js  # Validação Zod
│   ├── schemas/
│   │   ├── auth.schema.js          # Zod: login, register
│   │   ├── device.schema.js        # Zod: create/update device
│   │   ├── widget.schema.js        # Zod: create/update widget
│   │   └── user.schema.js          # Zod: update user
│   ├── models/
│   │   ├── User.js
│   │   ├── Device.js
│   │   ├── Widget.js
│   │   └── AccessRequest.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── device.controller.js
│   │   ├── widget.controller.js
│   │   ├── access.controller.js
│   │   └── mqtt.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── device.routes.js
│   │   ├── widget.routes.js
│   │   ├── access.routes.js
│   │   └── mqtt.routes.js
│   └── services/
│       ├── mqtt.service.js
│       └── token.service.js
├── database/
│   └── database.sqlite
├── .env
├── .env.example
└── package.json
```

## Dependências

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "better-sqlite3": "^9.2.2",
    "mqtt": "^5.3.0",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

## Banco de Dados SQLite

```sql
-- Usuários
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  has_access BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dispositivos
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mqtt_broker TEXT NOT NULL,
  mqtt_port TEXT DEFAULT '1883',
  mqtt_topic TEXT NOT NULL,
  mqtt_username TEXT,
  mqtt_password TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Relação N:N usuários-dispositivos
CREATE TABLE device_users (
  device_id INTEGER,
  user_id INTEGER,
  PRIMARY KEY (device_id, user_id),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Widgets (gráficos)
CREATE TABLE widgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('line', 'bar', 'pie', 'doughnut')),
  title TEXT NOT NULL,
  data_field TEXT NOT NULL,
  config TEXT NOT NULL,
  position_x INTEGER DEFAULT 50,
  position_y INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Solicitações de acesso
CREATE TABLE access_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_id INTEGER,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

-- Dados MQTT (histórico)
CREATE TABLE mqtt_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

## Endpoints da API

### Autenticação (sem auth)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastrar usuário (hasAccess=false, role='user') |
| POST | `/api/auth/login` | Login, retorna `{ token, user }` ou `401` |

### Autenticação (com JWT)
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/auth/me` | * | Dados do usuário logado |

### Usuários
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/users` | admin | Listar todos usuários |
| PUT | `/api/users/:id/access` | admin | Aprovar/revogar acesso |

### Dispositivos
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/devices` | * | Admin: todos, User: apenas os atribuídos |
| GET | `/api/devices/:id` | * | Detalhes do device |
| POST | `/api/devices` | admin | Criar device |
| PUT | `/api/devices/:id` | admin | Editar device |
| DELETE | `/api/devices/:id` | admin | Excluir device |
| PUT | `/api/devices/:id/users` | admin | Atualizar usuários do device |

### Widgets
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/devices/:deviceId/widgets` | * | Listar widgets do device |
| POST | `/api/devices/:deviceId/widgets` | admin | Criar widget |
| PUT | `/api/widgets/:id` | admin | Editar widget |
| DELETE | `/api/widgets/:id` | admin | Excluir widget |

### Solicitações de Acesso
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/access-requests` | admin | Listar pendentes |
| POST | `/api/access-requests` | user | Solicitar acesso |
| PUT | `/api/access-requests/:id/approve` | admin | Aprovar |
| PUT | `/api/access-requests/:id/reject` | admin | Rejeitar |

### Dados MQTT
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/devices/:id/mqtt-data?field=temperatura&period=day` | * | Dados filtrados |
| GET | `/api/devices/:id/mqtt-data/export?period=week` | * | Export Excel |

> **Legenda de Roles:** `*` = qualquer usuário autenticado, `admin` = apenas admin, `user` = apenas user

## Schemas Zod

### auth.schema.js
```javascript
const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória")
});

const registerSchema = z.object({
  username: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

module.exports = { loginSchema, registerSchema };
```

### device.schema.js
```javascript
const { z } = require('zod');

const createDeviceSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  mqttBroker: z.string().min(1, "Broker obrigatório"),
  mqttPort: z.string().default("1883"),
  mqttTopic: z.string().min(1, "Tópico obrigatório"),
  mqttUsername: z.string().optional(),
  mqttPassword: z.string().optional(),
  assignedUsers: z.array(z.number()).optional()
});

const updateDeviceSchema = createDeviceSchema.partial();

module.exports = { createDeviceSchema, updateDeviceSchema };
```

### widget.schema.js
```javascript
const { z } = require('zod');

const createWidgetSchema = z.object({
  type: z.enum(['line', 'bar', 'pie', 'doughnut']),
  title: z.string().min(1, "Título obrigatório"),
  dataField: z.string().min(1, "Campo de dados obrigatório"),
  config: z.object({
    labels: z.array(z.string()).optional(),
    backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
    borderColor: z.union([z.string(), z.array(z.string())]).optional(),
    fill: z.boolean().optional(),
    tension: z.number().optional()
  }).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional()
});

const updateWidgetSchema = createWidgetSchema.partial();

module.exports = { createWidgetSchema, updateWidgetSchema };
```

## MQTT Service

- Conectar ao broker HiveMQ: `mqtt://broker.hivemq.com:1883` (sem autenticação)
- Subscribe dinâmico: quando um device é criado, fazer subscribe no tópico
- Armazenar payloads JSON na tabela `mqtt_data`
- O ESP32 envia: `{ "temperatura": 25.5, "umidade": 68.2, "timestamp": "..." }`
- Cada widget usa `dataField` para selecionar qual campo exibir
- Manter apenas dados do dia atual (limpar dados antigos)
- Polling: frontend faz requisição a cada 5 segundos

## Seed de Usuários

Criar script `src/seed.js` com 3 usuários:

```javascript
const bcrypt = require('bcryptjs');
const db = require('./config/database');

const users = [
  {
    username: 'Administrador',
    email: 'admin@teste.com',
    password: 'admin123',
    role: 'admin',
    has_access: 1
  },
  {
    username: 'João Silva',
    email: 'user@teste.com',
    password: 'user123',
    role: 'user',
    has_access: 0 // aguardando aprovação
  },
  {
    username: 'Maria Demo',
    email: 'demo@teste.com',
    password: 'demo123',
    role: 'user',
    has_access: 1 // já aprovado
  }
];

async function seed() {
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    db.prepare(`
      INSERT OR IGNORE INTO users (username, email, password, role, has_access)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.username, user.email, hashedPassword, user.role, user.has_access);
  }
  console.log('Seed concluído!');
}

seed();
```

## Variáveis de Ambiente (.env)

```env
PORT=3001
JWT_SECRET=sua_chave_secreta_aqui_mude_em_producao
JWT_EXPIRES_IN=24h
MQTT_BROKER=mqtt://broker.hivemq.com:1883
```

## Respostas da API

### Sucesso
```json
{
  "success": true,
  "data": { ... }
}
```

### Erro
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "details": []
}
```

### Login bem-sucedido (200 OK)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "Administrador",
      "email": "admin@teste.com",
      "role": "admin",
      "hasAccess": true
    }
  }
}
```

### Login falhou (401 Unauthorized)
```json
{
  "success": false,
  "error": "E-mail ou senha inválidos"
}
```

## Mensagens de Erro Padrão

| Situação | Mensagem | Status |
|----------|----------|--------|
| Login incorreto | "E-mail ou senha inválidos" | 401 |
| Token inválido | "Token inválido ou expirado" | 401 |
| Sem permissão | "Acesso não autorizado" | 403 |
| Não encontrado | "Recurso não encontrado" | 404 |
| Validação | Erros do Zod formatados | 400 |

## Observações Importantes

1. Usar `better-sqlite3` (síncrono, mais simples) ao invés de sqlite3 assíncrono
2. Senhas devem ser hasheadas com bcrypt (saltRounds: 10)
3. JWT deve conter: `{ id, email, role }`
4. CORS deve permitir origem `http://localhost:3000`
5. O middleware de auth deve injetar `req.user` após validar token
6. O middleware RBAC verifica `req.user.role` contra roles permitidas
7. Rotas de devices para users devem filtrar por `device_users`
8. Usar `helmet` para headers de segurança
9. Todas as rotas devem estar sob o prefixo `/api`

## Fluxo de Autenticação

```
┌─────────────┐     POST /api/auth/login      ┌─────────────┐
│   Frontend  │ ─────────────────────────────▶│   Backend   │
│             │   { email, password }         │             │
└─────────────┘                               └──────┬──────┘
                                                     │
                                              Valida credenciais
                                              com bcrypt.compare
                                                     │
                                              ┌──────▼──────┐
                                              │  Gera JWT   │
                                              │ { id, email,│
                                              │   role }    │
                                              └──────┬──────┘
                                                     │
┌─────────────┐     200 + { token, user }     ┌──────▼──────┐
│   Frontend  │ ◀─────────────────────────────│   Backend   │
│             │                               │             │
└──────┬──────┘                               └─────────────┘
       │
  Armazena token
  no localStorage
       │
┌──────▼──────┐     GET /api/devices          ┌─────────────┐
│   Frontend  │ ─────────────────────────────▶│   Backend   │
│             │   Authorization: Bearer xxx   │             │
└─────────────┘                               └─────────────┘
```

## Fluxo de Dados MQTT

```
┌─────────────┐      MQTT Publish       ┌─────────────┐
│   ESP32     │ ───────────────────────▶│   HiveMQ    │
│  (Sensor)   │  topic: lab/sensor/01   │   Broker    │
│             │  {"temp":25,"humid":68} │             │
└─────────────┘                         └──────┬──────┘
                                               │
                                    MQTT Subscribe
                                               │
                                        ┌──────▼──────┐
                                        │   Backend   │
                                        │  (Node.js)  │
                                        │             │
                                        │ Armazena em │
                                        │  mqtt_data  │
                                        └──────┬──────┘
                                               │
                                    GET /api/devices/:id/mqtt-data
                                    ?field=temp&period=day
                                               │
                                        ┌──────▼──────┐
                                        │  Frontend   │
                                        │   (React)   │
                                        │  📊 Chart   │
                                        └─────────────┘
```
