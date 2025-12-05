# 📋 Tarefas de Implementação do Backend

## Progresso Geral
- [x] **Fase 1**: Setup inicial e configuração
- [x] **Fase 2**: Autenticação (JWT + bcrypt)
- [ ] **Fase 3**: CRUD de Usuários
- [ ] **Fase 4**: CRUD de Dispositivos
- [ ] **Fase 5**: CRUD de Widgets
- [ ] **Fase 6**: Sistema de Notificações/Acesso
- [ ] **Fase 7**: Integração MQTT
- [ ] **Fase 8**: Integração Frontend

---

## Fase 1: Setup Inicial e Configuração

### Tarefa 1.1: Criar estrutura de pastas e package.json
- [x] Criar pasta `backend/`
- [x] Criar `package.json` com dependências
- [x] Criar estrutura de pastas (`src/`, `database/`, etc.)
- [x] Criar arquivos `.env` e `.env.example`

**Status**: 🔍 Em revisão

**Arquivos criados**:
```
backend/
├── package.json
├── .env
├── .env.example
├── database/
└── src/
    ├── index.js
    ├── seed.js
    ├── config/
    │   ├── database.js
    │   └── mqtt.js
    ├── middleware/
    │   ├── auth.middleware.js
    │   ├── rbac.middleware.js
    │   └── validate.middleware.js
    ├── schemas/
    │   ├── auth.schema.js
    │   ├── device.schema.js
    │   ├── widget.schema.js
    │   └── user.schema.js
    ├── models/
    │   ├── User.js
    │   ├── Device.js
    │   ├── Widget.js
    │   └── AccessRequest.js
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── user.controller.js
    │   ├── device.controller.js
    │   ├── widget.controller.js
    │   ├── access.controller.js
    │   └── mqtt.controller.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── device.routes.js
    │   ├── widget.routes.js
    │   ├── access.routes.js
    │   └── mqtt.routes.js
    └── services/
        ├── token.service.js
        └── mqtt.service.js
```

**Para testar**:
```bash
cd backend
npm install
npm run dev
# Acesse: http://localhost:3001/api/health
```

---

### Tarefa 1.2: Configurar banco de dados SQLite
- [x] Criar `src/config/database.js`
- [x] Criar todas as tabelas (users, devices, widgets, etc.)
- [x] Testar conexão

**Status**: ✅ Concluído

**Arquivos modificados**:
- `src/config/database.js` - Configuração completa do sql.js
- `src/index.js` - Inicialização do banco ao iniciar servidor

**Funções disponíveis no database.js**:
- `initDatabase()` - Inicializa o banco
- `run(sql, params)` - Executa INSERT/UPDATE/DELETE
- `query(sql, params)` - Executa SELECT (retorna array)
- `queryOne(sql, params)` - Executa SELECT (retorna 1 objeto)
- `lastInsertRowId()` - Retorna último ID inserido

**Para testar**:
```bash
npm run dev
```

Deve aparecer no console:
```
✅ Novo banco de dados criado
✅ Tabelas criadas/verificadas com sucesso
🚀 Servidor rodando em http://localhost:3001
```

E o arquivo `database/database.sqlite` deve ser criado.

---

### Tarefa 1.3: Criar seed de usuários
- [x] Criar `src/seed.js`
- [x] Inserir 3 usuários de teste (admin, user, demo)

**Status**: ✅ Concluído

**Para testar**:
```bash
npm run seed
```

Deve aparecer:
```
✅ Usuário criado: admin@teste.com (admin - com acesso)
✅ Usuário criado: user@teste.com (user - sem acesso)
✅ Usuário criado: demo@teste.com (user - com acesso)
🎉 Seed concluído! 3 usuário(s) criado(s).
```

---

## Fase 2: Autenticação

### Tarefa 2.1: Schemas Zod de autenticação
- [x] Criar `src/schemas/auth.schema.js`
- [x] loginSchema (email, password)
- [x] registerSchema (username, email, password)

**Status**: ✅ Concluído

---

### Tarefa 2.2: Middleware de validação
- [x] Criar `src/middleware/validate.middleware.js`

**Status**: ✅ Concluído

---

### Tarefa 2.3: Serviço de Token JWT
- [x] Criar `src/services/token.service.js`
- [x] Função para gerar token
- [x] Função para verificar token

**Status**: ✅ Concluído

---

### Tarefa 2.4: Model de Usuário
- [x] Criar `src/models/User.js`
- [x] Funções: findByEmail, create, findById, findAll, updateAccess, toPublic

**Status**: ✅ Concluído

---

### Tarefa 2.5: Controller de Autenticação
- [x] Criar `src/controllers/auth.controller.js`
- [x] POST /register
- [x] POST /login
- [x] GET /me

**Status**: ✅ Concluído

---

### Tarefa 2.6: Rotas de Autenticação
- [x] Criar `src/routes/auth.routes.js`
- [x] Registrar rotas no index.js

**Status**: ✅ Concluído

---

### Tarefa 2.7: Middleware de Autenticação JWT
- [x] Criar `src/middleware/auth.middleware.js`

**Status**: ✅ Concluído

---

### Tarefa 2.8: Middleware RBAC
- [x] Criar `src/middleware/rbac.middleware.js`

**Status**: ✅ Concluído

---

## Fase 3: CRUD de Usuários

### Tarefa 3.1: Controller de Usuários
- [x] Criar `src/controllers/user.controller.js`
- [x] GET /users (admin)
- [x] PUT /users/:id/access (admin)

**Status**: ✅ Concluído

---

### Tarefa 3.2: Rotas de Usuários
- [x] Criar `src/routes/user.routes.js`

**Status**: ✅ Concluído

---

## Fase 4: CRUD de Dispositivos

### Tarefa 4.1: Schema Zod de Device
- [x] Criar `src/schemas/device.schema.js`

**Status**: ✅ Concluído

---

### Tarefa 4.2: Model de Device
- [x] Criar `src/models/Device.js`

**Status**: ✅ Concluído

---

### Tarefa 4.3: Controller de Devices
- [x] Criar `src/controllers/device.controller.js`

**Status**: ✅ Concluído

---

### Tarefa 4.4: Rotas de Devices
- [x] Criar `src/routes/device.routes.js`
- [x] Registrar rotas no index.js

**Status**: ✅ Concluído

**Endpoints disponíveis**:
- `GET /api/devices` - Lista dispositivos (admin: todos, user: apenas seus)
- `GET /api/devices/:id` - Busca dispositivo por ID
- `POST /api/devices` - Cria dispositivo (admin)
- `PUT /api/devices/:id` - Atualiza dispositivo (admin)
- `DELETE /api/devices/:id` - Remove dispositivo (admin)
- `PUT /api/devices/:id/users` - Atualiza usuários do dispositivo (admin)

---

## Fase 5: CRUD de Widgets

### Tarefa 5.1: Schema Zod de Widget
- [x] Criar `src/schemas/widget.schema.js`

**Status**: ✅ Concluído

---

### Tarefa 5.2: Model de Widget
- [x] Criar `src/models/Widget.js`

**Status**: ✅ Concluído

---

### Tarefa 5.3: Controller de Widgets
- [x] Criar `src/controllers/widget.controller.js`

**Status**: ✅ Concluído

---

### Tarefa 5.4: Rotas de Widgets
- [x] Criar `src/routes/widget.routes.js`
- [x] Registrar rotas no index.js

**Status**: ✅ Concluído

**Tipos de widgets suportados**: `chart`, `gauge`, `table`, `card`, `map`

**Endpoints disponíveis**:
- `GET /api/widgets` - Lista widgets (admin: todos, user: dos seus devices)
- `GET /api/widgets/device/:deviceId` - Lista widgets de um dispositivo
- `GET /api/widgets/:id` - Busca widget por ID
- `POST /api/widgets` - Cria widget (admin)
- `PUT /api/widgets/:id` - Atualiza widget (admin)
- `DELETE /api/widgets/:id` - Remove widget (admin)

---

## Fase 6: Sistema de Notificações/Acesso

### Tarefa 6.1: Model de AccessRequest
- [x] Criar `src/models/AccessRequest.js`

**Status**: ✅ Concluído

---

### Tarefa 6.2: Controller de Access
- [x] Criar `src/controllers/access.controller.js`

**Status**: ✅ Concluído

---

### Tarefa 6.3: Rotas de Access
- [x] Criar `src/routes/access.routes.js`
- [x] Registrar rotas no index.js

**Status**: ✅ Concluído

**Fluxo de solicitação de acesso**:
1. Usuário sem acesso faz `POST /api/access` com mensagem opcional
2. Admin vê pendentes em `GET /api/access?status=pending`
3. Admin aprova com `PUT /api/access/:id/approve` → usuário ganha acesso
4. Ou rejeita com `PUT /api/access/:id/reject`

**Endpoints disponíveis**:
- `GET /api/access` - Lista solicitações (admin: todas, user: suas)
- `GET /api/access?status=pending` - Filtra por status
- `GET /api/access/pending/count` - Conta pendentes (para badge)
- `POST /api/access` - Cria solicitação
- `PUT /api/access/:id/approve` - Aprova (admin)
- `PUT /api/access/:id/reject` - Rejeita (admin)

---

## Fase 7: Integração MQTT

### Tarefa 7.1: Configuração MQTT
- [x] Configuração integrada no service

**Status**: ✅ Concluído (integrado no mqtt.service.js)

---

### Tarefa 7.2: Serviço MQTT
- [x] Criar `src/services/mqtt.service.js`
- [x] Conexão/desconexão por dispositivo
- [x] Cache de último dado
- [x] Armazenamento no banco
- [x] Busca por período (day/week)

**Status**: ✅ Concluído

---

### Tarefa 7.3: Controller MQTT
- [x] Criar `src/controllers/mqtt.controller.js`

**Status**: ✅ Concluído

---

### Tarefa 7.4: Rotas MQTT
- [x] Criar `src/routes/mqtt.routes.js`
- [x] Registrar rotas no index.js

**Status**: ✅ Concluído

**Endpoints disponíveis**:
- `GET /api/mqtt/status` - Status das conexões
- `POST /api/mqtt/connect-all` - Conecta todos (admin)
- `POST /api/mqtt/:id/connect` - Conecta dispositivo (admin)
- `POST /api/mqtt/:id/disconnect` - Desconecta (admin)
- `GET /api/mqtt/:id/latest` - Último dado
- `GET /api/mqtt/:id/data` - Dados históricos
- `GET /api/mqtt/:id/data?period=day` - Dados do dia (gráficos)
- `GET /api/mqtt/:id/data?period=week` - Dados da semana (Excel)

---

## Fase 8: Integração Frontend

### Tarefa 8.1: Criar serviço API no frontend
- [x] Criar `src/services/api.js` com fetch nativo

**Status**: ✅ Concluído

**Serviços disponíveis**:
- `api.auth` - login, register, me, logout, isAuthenticated
- `api.users` - getAll, updateAccess
- `api.devices` - getAll, getById, create, update, delete, updateUsers
- `api.widgets` - getAll, getByDevice, create, update, delete
- `api.access` - getAll, countPending, create, approve, reject
- `api.mqtt` - getStatus, connect, disconnect, getLatest, getData

---

### Tarefa 8.2: Adaptar App.js
- [x] Verificar token ao carregar (useEffect)
- [x] Buscar dados da API
- [x] Polling para verificar acesso (10s)
- [x] Download de dados como CSV

**Status**: ✅ Concluído

---

### Tarefa 8.3: Funcionalidades integradas
- [x] Login com API real
- [x] Registro com API real
- [x] Carregar dispositivos da API
- [x] Carregar widgets da API
- [x] Solicitar acesso via API
- [x] Download de dados MQTT como CSV

**Status**: ✅ Concluído

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ⏳ | Aguardando |
| 🔄 | Em andamento |
| ✅ | Concluído |
| ❌ | Bloqueado |
| 🔍 | Em revisão |

---

## Histórico de Validações

| Data | Tarefa | Status | Observações |
|------|--------|--------|-------------|
| - | - | - | - |
