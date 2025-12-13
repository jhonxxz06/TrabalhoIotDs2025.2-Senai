# 🚀 Checklist de Migração - SQLite para Supabase

**Projeto:** IoT Dashboard - Clear Air SENAI  
**Data de início:** 13/12/2025  
**Branch:** `supabase-migration`  
**Tempo estimado:** 4-6 horas

---

## 📋 Informações do Supabase

```
URL: https://voxgdmqwndnyubsphmjk.supabase.co

Anon Key (Frontend): 
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZveGdkbXF3bmRueXVic3BobWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDEwODIsImV4cCI6MjA4MDk3NzA4Mn0.vtrT3mZuBKTmlvyH7slZnGuCXRYRrg4AiiYMJWlBnB0

Service Role Key (Backend):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZveGdkbXF3bmRueXVic3BobWprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQwMTA4MiwiZXhwIjoyMDgwOTc3MDgyfQ.EqaCFiJIxD6y-9K0EHtRHZs5eCViTbSf2T3njwJrBWU

⚠️ CRÍTICO: NUNCA commitar a service_role key no Git! Ela tem acesso total ao banco.
```

---

## ✅ FASE 0: Preparação (30 minutos)

### 0.1 - SQL no Supabase
- [ ] Acessar Supabase Dashboard: https://voxgdmqwndnyubsphmjk.supabase.co
- [ ] Ir em **SQL Editor** (menu lateral)
- [ ] Criar nova query
- [ ] Copiar todo conteúdo de `SQL_SUPABASE_FINAL_CORRIGIDO.sql`
- [ ] Executar SQL (botão "Run")
- [ ] Verificar se criou 6 tabelas: `profiles`, `devices`, `device_users`, `widgets`, `access_requests`, `mqtt_data`

### 0.2 - Service Role Key (✅ JÁ OBTIDA)
- [x] Ir em **Settings** → **API**
- [x] Na seção "Project API keys", copiar a chave **`service_role`**
- [x] ⚠️ **NUNCA** commitar essa chave no Git!
- [x] Key já disponível no topo deste documento
### 0.3 - Configurar Backend .env
- [ ] Abrir `backend/.env` (criar se não existir)
- [ ] Adicionar variáveis (copiar e colar):
```env
SUPABASE_URL=https://voxgdmqwndnyubsphmjk.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZveGdkbXF3bmRueXVic3BobWprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQwMTA4MiwiZXhwIjoyMDgwOTc3MDgyfQ.EqaCFiJIxD6y-9K0EHtRHZs5eCViTbSf2T3njwJrBWU
JWT_SECRET=sua_chave_super_secreta_mude_em_producao
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
```T=3001
```

### 0.4 - Configurar Frontend .env
- [ ] Abrir `frontend/teste-mcp/.env` (criar se não existir)
- [ ] Adicionar variáveis:
```env
REACT_APP_SUPABASE_URL=https://voxgdmqwndnyubsphmjk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZveGdkbXF3bmRueXVic3BobWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDEwODIsImV4cCI6MjA4MDk3NzA4Mn0.vtrT3mZuBKTmlvyH7slZnGuCXRYRrg4AiiYMJWlBnB0
```

### 0.5 - Instalar Dependências
- [ ] Abrir terminal no diretório `backend`
- [ ] Executar: `npm install @supabase/supabase-js`
- [ ] Verificar se apareceu em `package.json`

### 0.6 - Arquivos de Configuração Supabase
- [ ] Verificar se existe `backend/src/config/supabase.js` (criado nas implementações #4)
- [ ] Verificar se existe `frontend/teste-mcp/src/config/supabase.js`
- [ ] Se não existirem, serão criados na próxima fase

**Status Fase 0:** ⏳ Em andamento

---

## ✅ FASE 1: Configuração Supabase (15 minutos)

### 1.1 - Backend Config (se não existe)
- [ ] Criar/verificar `backend/src/config/supabase.js`
- [ ] Implementar client com service_role key
- [ ] Adicionar validação de variáveis obrigatórias
- [ ] Testar inicialização: `node -e "require('./src/config/supabase')"`

### 1.2 - Frontend Config (se não existe)
- [ ] Criar/verificar `frontend/teste-mcp/src/config/supabase.js`
- [ ] Implementar client com anon key
- [ ] Exportar client

### 1.3 - Verificação
- [ ] Backend inicia sem erros de configuração
- [ ] Console mostra: `✅ Supabase configurado (service_role)`

**Status Fase 1:** ⏳ Pendente

---

## ✅ FASE 2: Migrar Models (2 horas)

### 2.1 - Profile Model (novo)
- [ ] Criar `backend/src/models/Profile.js`
- [ ] Implementar `findById(id)` - busca profile por UUID
- [ ] Implementar `findByEmail(email)` - busca profile por email
- [ ] Implementar `findAll()` - lista todos profiles
- [ ] Implementar `update(id, data)` - atualiza role/has_access
- [ ] Implementar `updateAccess(id, hasAccess)` - aprovar/negar acesso
- [ ] Implementar `toPublic(profile)` - remove campos sensíveis
- [ ] Testar cada método isoladamente

### 2.2 - Device Model
- [ ] Abrir `backend/src/models/Device.js`
- [ ] Substituir imports: `require('../config/database')` → `require('../config/supabase')`
- [ ] Converter `findById(id)` para async/await com Supabase
- [ ] Converter `findAll()` para async/await
- [ ] Converter `findByUserId(userId)` com JOIN via `device_users`
- [ ] Converter `create(data)` - adicionar `owner_id`
- [ ] Converter `update(id, data)` para async/await
- [ ] Converter `remove(id)` para async/await
- [ ] Converter `getAssignedUsers(deviceId)` com JOIN
- [ ] Converter `setAssignedUsers(deviceId, userIds)` - delete + insert
- [ ] Converter `userHasAccess(deviceId, userId)` para async/await
- [ ] Atualizar `toPublic()` se necessário (UUIDs)
- [ ] Testar métodos principais

### 2.3 - Widget Model
- [ ] Abrir `backend/src/models/Widget.js`
- [ ] Substituir imports: `require('../config/database')` → `require('../config/supabase')`
- [ ] Converter `findById(id)` para async/await
- [ ] Converter `findAll()` para async/await
- [ ] Converter `findByDeviceId(deviceId)` para async/await
- [ ] Converter `findByUserId(userId)` com JOIN duplo (widgets → devices → device_users)
- [ ] Converter `create(data)` - remover stringify (Supabase aceita JSON direto)
- [ ] Converter `update(id, data)` para async/await
- [ ] Converter `remove(id)` para async/await
- [ ] Atualizar `toPublic()` se necessário
- [ ] Testar métodos principais

### 2.4 - AccessRequest Model
- [ ] Abrir `backend/src/models/AccessRequest.js`
- [ ] Substituir imports: `require('../config/database')` → `require('../config/supabase')`
- [ ] Converter `findById(id)` com JOINs (users, devices)
- [ ] Converter `findAll(status)` para async/await
- [ ] Converter `findByUserId(userId)` para async/await
- [ ] Converter `findPending()` para async/await
- [ ] Converter `create(data)` para async/await
- [ ] Converter `approve(id, reviewedBy)` - update status + reviewed_at
- [ ] Converter `reject(id, reviewedBy)` para async/await
- [ ] Converter `remove(id)` para async/await
- [ ] Testar métodos principais

### 2.5 - Criar MqttData Model (novo)
- [ ] Criar `backend/src/models/MqttData.js`
- [ ] Implementar `create(data)` - inserir dados MQTT
- [ ] Implementar `findByDeviceId(deviceId, limit)` - buscar últimos N registros
- [ ] Implementar `findRecent(deviceId, minutes)` - buscar por período
- [ ] Implementar `deleteOld(days)` - limpar dados antigos (opcional)

**Status Fase 2:** ⏳ Pendente

---

## ✅ FASE 3: Migrar Autenticação (1.5 horas)

### 3.1 - Auth Controller - Login
- [ ] Abrir `backend/src/controllers/auth.controller.js`
- [ ] Substituir `User.findByEmail()` por `supabase.auth.signInWithPassword()`
- [ ] Remover validação `bcrypt.compareSync()`
- [ ] Substituir JWT manual por `data.session.access_token`
- [ ] Buscar profile do usuário: `Profile.findById(data.user.id)`
- [ ] Retornar token + user com role/has_access
- [ ] Testar login com usuário existente

### 3.2 - Auth Controller - Register
- [ ] Substituir `User.create()` por `supabase.auth.signUp()`
- [ ] Adicionar metadata: `{ username, role: 'user', has_access: false }`
- [ ] Remover hash de senha (Supabase gerencia)
- [ ] Verificar se trigger criou profile automaticamente
- [ ] Retornar sucesso (sem auto-login, aguardar aprovação)
- [ ] Testar registro de novo usuário

### 3.3 - Auth Middleware - Validação Token
- [ ] Abrir `backend/src/middleware/auth.middleware.js`
- [ ] Substituir `jwt.verify()` por `supabase.auth.getUser(token)`
- [ ] Se válido, buscar profile: `Profile.findById(user.id)`
- [ ] Adicionar `req.user = { id, email, username, role, has_access }`
- [ ] Testar requisição autenticada

### 3.4 - Criar Admin Manual (primeira vez)
- [ ] Ir no Supabase Dashboard → **Authentication** → **Users**
- [ ] Clicar "Add user" → "Create new user"
- [ ] Email: `admin@test.com`
- [ ] Password: `admin123` (ou sua escolha)
- [ ] Confirmar email automaticamente: ✅
- [ ] Copiar UUID do usuário criado
- [ ] Ir no **SQL Editor** e executar:
```sql
UPDATE profiles 
SET role = 'admin', has_access = true 
WHERE id = 'UUID_DO_ADMIN_AQUI';
```
- [ ] Testar login com admin

**Status Fase 3:** ⏳ Pendente

---

## ✅ FASE 4: Atualizar Controllers (1 hora)

### 4.1 - Device Controller
- [ ] Abrir `backend/src/controllers/device.controller.js`
- [ ] Adicionar `async` em todas as funções
- [ ] Adicionar `await` nas chamadas de `Device.*`
- [ ] No `create()`: adicionar `owner_id: req.user.id`
- [ ] Atualizar tratamento de erros para `try/catch`
- [ ] Testar: GET /devices, POST /devices, PUT /devices/:id, DELETE /devices/:id

### 4.2 - Widget Controller
- [ ] Abrir `backend/src/controllers/widget.controller.js`
- [ ] Adicionar `async` em todas as funções
- [ ] Adicionar `await` nas chamadas de `Widget.*`
- [ ] Atualizar tratamento de erros para `try/catch`
- [ ] Testar: GET /widgets, POST /widgets, PUT /widgets/:id, DELETE /widgets/:id

### 4.3 - User Controller
- [ ] Abrir `backend/src/controllers/user.controller.js`
- [ ] Substituir `User.*` por `Profile.*`
- [ ] Adicionar `async` em todas as funções
- [ ] Adicionar `await` nas chamadas
- [ ] Atualizar tratamento de erros
- [ ] Testar: GET /users, PUT /users/:id

### 4.4 - Access Controller
- [ ] Abrir `backend/src/controllers/access.controller.js`
- [ ] Adicionar `async` em todas as funções
- [ ] Adicionar `await` nas chamadas de `AccessRequest.*`
- [ ] Adicionar `await` nas chamadas de `Profile.*` (ex: updateAccess)
- [ ] Atualizar tratamento de erros
- [ ] Testar: GET /access, POST /access, PUT /access/:id/approve, DELETE /access/:id

### 4.5 - MQTT Controller (se existir)
- [ ] Verificar se existe `backend/src/controllers/mqtt.controller.js`
- [ ] Adicionar `async/await` se necessário
- [ ] Atualizar para usar `MqttData.findByDeviceId()`

**Status Fase 4:** ⏳ Pendente

---

## ✅ FASE 5: Atualizar Services (30 minutos)

### 5.1 - MQTT Service
- [ ] Abrir `backend/src/services/mqtt.service.js`
- [ ] Importar `{ supabase }` de `../config/supabase`
- [ ] No listener `client.on('message')`: substituir salvamento SQLite por:
```javascript
await supabase.from('mqtt_data').insert({
  device_id: deviceId, // UUID do device
  topic,
  payload: JSON.parse(message),
  received_at: new Date().toISOString()
});
```
- [ ] Adicionar `async` na função que salva dados
- [ ] Atualizar `connectDevice()` para buscar devices do Supabase
- [ ] Testar: publicar mensagem MQTT e verificar se aparece em `mqtt_data`

### 5.2 - Token Service (remover se existir)
- [ ] Verificar se existe `backend/src/services/token.service.js`
- [ ] Se existir e for só para JWT, pode remover (Supabase gerencia)
- [ ] Se tiver outras funções, adaptar conforme necessário

**Status Fase 5:** ⏳ Pendente

---

## ✅ FASE 6: Atualizar Schemas de Validação (15 minutos)

### 6.1 - Widget Schema
- [ ] Abrir `backend/src/schemas/widget.schema.js`
- [ ] Substituir `deviceId: z.number().int().positive()` por:
```javascript
deviceId: z.string().uuid('Device ID deve ser UUID válido')
```
- [ ] Verificar se validação JSONB (implementação #2) está presente
- [ ] Salvar arquivo

### 6.2 - Device Schema (se existir)
- [ ] Verificar se existe `backend/src/schemas/device.schema.js`
- [ ] Se tiver validação de IDs, trocar para UUID
- [ ] Salvar arquivo

### 6.3 - User/Access Schemas
- [ ] Verificar `backend/src/schemas/user.schema.js`
- [ ] Verificar se tem validação de IDs numéricos
- [ ] Trocar para UUID se necessário

**Status Fase 6:** ⏳ Pendente

---

## ✅ FASE 7: Atualizar Routes (10 minutos)

### 7.1 - Verificar Auth Routes
- [ ] Abrir `backend/src/routes/auth.routes.js`
- [ ] Garantir que `login` e `register` não exigem autenticação
- [ ] Salvar se houver mudanças

### 7.2 - Verificar Demais Routes
- [ ] Verificar `device.routes.js`, `widget.routes.js`, etc
- [ ] Garantir que middleware de autenticação está aplicado corretamente
- [ ] Nenhuma mudança estrutural necessária (só verificação)

**Status Fase 7:** ⏳ Pendente

---

## ✅ FASE 8: Remover Código SQLite Antigo (15 minutos)

### 8.1 - Database Config (manter por enquanto)
- [ ] **NÃO** deletar `backend/src/config/database.js` ainda
- [ ] Comentar todo o código (backup)
- [ ] Adicionar comentário: `// DEPRECATED - Migrado para Supabase`

### 8.2 - Seed (adaptar se necessário)
- [ ] Abrir `backend/src/seed.js`
- [ ] Se for usado, adaptar para criar dados via Supabase
- [ ] Se não for usado, comentar código

### 8.3 - User Model Antigo
- [ ] **NÃO** deletar `backend/src/models/User.js`
- [ ] Renomear para `User.js.bak` (backup)
- [ ] Criar referência simbólica: `User.js` → `Profile.js` (se necessário)

**Status Fase 8:** ⏳ Pendente

---

## ✅ FASE 9: Testes Backend (1 hora)

### 9.1 - Testar Autenticação
- [ ] **Login:** POST `/api/auth/login` com admin@test.com
  - Deve retornar token JWT válido
  - Deve retornar user com `role: 'admin'`
- [ ] **Register:** POST `/api/auth/register` com novo usuário
  - Deve criar usuário com `has_access: false`
  - Deve aparecer em `profiles` no Supabase
- [ ] **Token inválido:** GET `/api/devices` sem Authorization
  - Deve retornar 401

### 9.2 - Testar Devices
- [ ] **Listar (admin):** GET `/api/devices`
  - Deve retornar array (vazio ou com devices)
- [ ] **Criar:** POST `/api/devices` (como admin)
  ```json
  {
    "name": "Sensor Teste",
    "mqttBroker": "broker.hivemq.com",
    "mqttPort": 1883,
    "mqttTopic": "test/sensor"
  }
  ```
  - Deve retornar device com UUID
  - Deve ter `owner_id` = UUID do admin
  - Verificar no Supabase se device apareceu
- [ ] **Buscar:** GET `/api/devices/{uuid}`
  - Deve retornar device específico
- [ ] **Atualizar:** PUT `/api/devices/{uuid}`
  - Deve atualizar campos
- [ ] **Deletar:** DELETE `/api/devices/{uuid}`
  - Deve remover device

### 9.3 - Testar Widgets
- [ ] **Criar widget:** POST `/api/widgets`
  ```json
  {
    "name": "Temperatura",
    "type": "line",
    "deviceId": "uuid-do-device",
    "config": {
      "mqttField": "temperature"
    },
    "position": {
      "x": 0,
      "y": 0,
      "width": 400,
      "height": 300
    }
  }
  ```
  - Deve retornar widget com UUID
  - Verificar no Supabase
- [ ] **Listar widgets do device:** GET `/api/widgets/device/{uuid}`
  - Deve retornar array de widgets
- [ ] **Atualizar:** PUT `/api/widgets/{uuid}`
- [ ] **Deletar:** DELETE `/api/widgets/{uuid}`

### 9.4 - Testar Access Requests
- [ ] **Criar solicitação:** POST `/api/access` (como user comum)
  ```json
  {
    "deviceId": "uuid-do-device",
    "message": "Preciso acessar sensor"
  }
  ```
- [ ] **Listar (admin):** GET `/api/access`
  - Deve mostrar solicitação pendente
- [ ] **Aprovar:** PUT `/api/access/{uuid}/approve` (como admin)
  - Deve mudar status para 'approved'
  - Deve atualizar `has_access` do user para `true`
- [ ] **Rejeitar:** PUT `/api/access/{uuid}/reject` (como admin)

### 9.5 - Testar MQTT
- [ ] **Conectar device:** Backend deve conectar automaticamente aos devices cadastrados
- [ ] **Publicar mensagem MQTT:**
  - Usar MQTT Explorer ou comando:
  ```bash
  mosquitto_pub -h broker.hivemq.com -t "test/sensor" -m '{"temperature":25.5,"humidity":60}'
  ```
- [ ] **Verificar salvamento:**
  - GET `/api/mqtt/data/{device_uuid}?limit=10`
  - Deve retornar mensagem recebida
  - Verificar tabela `mqtt_data` no Supabase

**Status Fase 9:** ⏳ Pendente

---

## ✅ FASE 10: Atualizar Frontend (30 minutos)

### 10.1 - Configuração já feita
- [ ] Verificar se `.env` do frontend foi criado (Fase 0.4)
- [ ] Verificar se `config/supabase.js` existe

### 10.2 - API Service (opcional - pode usar REST ainda)
- [ ] Abrir `frontend/teste-mcp/src/services/api.js`
- [ ] **Opção A:** Manter chamadas REST (nenhuma mudança necessária)
- [ ] **Opção B:** Trocar algumas calls para Supabase direto:
  ```javascript
  // Em vez de fetch('/api/devices')
  const { data } = await supabase.from('devices').select('*');
  ```
- [ ] Por enquanto, **manter REST** (mais seguro)

### 10.3 - Testar Frontend
- [ ] Iniciar frontend: `npm start`
- [ ] **Página de Login:**
  - Tentar login com admin@test.com
  - Deve redirecionar para dashboard
- [ ] **Dashboard:**
  - Widgets devem carregar
  - Gráficos devem renderizar
- [ ] **Devices Page:**
  - Lista de devices deve aparecer
  - Criar novo device
  - Editar device
  - Deletar device
- [ ] **Admin Dashboard:**
  - Solicitações de acesso devem aparecer
  - Aprovar/rejeitar deve funcionar

**Status Fase 10:** ⏳ Pendente

---

## ✅ FASE 11: Realtime (Supabase Realtime - Opcional)

### 11.1 - Substituir Socket.IO por Supabase Realtime
- [ ] Abrir `frontend/teste-mcp/src/components/DashboardPage/DashboardPage.js`
- [ ] Substituir:
```javascript
// ANTES (Socket.IO)
socket.on('mqtt:data', handleMqttData);

// DEPOIS (Supabase Realtime)
const channel = supabase
  .channel('mqtt_data')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'mqtt_data',
    filter: `device_id=eq.${deviceId}`
  }, (payload) => {
    console.log('📥 Novo dado MQTT:', payload.new);
    setMqttData(prev => [payload.new, ...prev].slice(0, 20));
  })
  .subscribe();

// Cleanup
return () => { channel.unsubscribe(); };
```
- [ ] Testar se dados aparecem em tempo real ao publicar MQTT

### 11.2 - Remover Socket.IO (opcional)
- [ ] Se Realtime funcionar bem, remover:
  - `socket.io-client` do frontend
  - `socket.io` do backend
  - Código relacionado em `backend/src/index.js`

**Status Fase 11:** ⏳ Pendente (opcional)

---

## ✅ FASE 12: Limpeza e Documentação (30 minutos)

### 12.1 - Limpar Arquivos Antigos
- [ ] Deletar `backend/src/config/database.js.bak` (se não precisar mais)
- [ ] Deletar `backend/src/models/User.js.bak`
- [ ] Remover pacotes não usados:
  ```bash
  npm uninstall bcryptjs jsonwebtoken sql.js
  ```

### 12.2 - Atualizar README
- [ ] Atualizar `README.md` com:
  - Instruções de configuração Supabase
  - Como obter service_role key
  - Como criar admin manualmente
  - Variáveis de ambiente necessárias

### 12.3 - Atualizar CHANGELOG
- [ ] Adicionar entrada em `CHANGELOG.md`:
  ```markdown
  ## [2.0.0] - 2025-12-13
  ### Changed
  - Migração completa de SQLite para Supabase PostgreSQL
  - Autenticação migrada para Supabase Auth
  - IDs migrados de INTEGER para UUID
  - Row Level Security (RLS) implementado
  
  ### Added
  - Supabase Realtime para dados MQTT em tempo real
  - Profile model separado de autenticação
  - Campo owner_id em devices
  
  ### Removed
  - SQLite e sql.js
  - Autenticação JWT manual
  - bcryptjs para hash de senhas
  ```

### 12.4 - Commit Final
- [ ] Revisar mudanças: `git status`
- [ ] Adicionar arquivos: `git add .`
- [ ] Commit: `git commit -m "feat: Migração completa para Supabase"`
- [ ] Push: `git push origin supabase-migration`

**Status Fase 12:** ⏳ Pendente

---

## 📊 PROGRESSO GERAL

| Fase | Descrição | Tempo | Status |
|------|-----------|-------|--------|
| 0 | Preparação | 30min | ⏳ Pendente |
| 1 | Configuração Supabase | 15min | ⏳ Pendente |
| 2 | Migrar Models | 2h | ⏳ Pendente |
| 3 | Migrar Autenticação | 1.5h | ⏳ Pendente |
| 4 | Atualizar Controllers | 1h | ⏳ Pendente |
| 5 | Atualizar Services | 30min | ⏳ Pendente |
| 6 | Atualizar Schemas | 15min | ⏳ Pendente |
| 7 | Atualizar Routes | 10min | ⏳ Pendente |
| 8 | Remover SQLite | 15min | ⏳ Pendente |
| 9 | Testes Backend | 1h | ⏳ Pendente |
| 10 | Atualizar Frontend | 30min | ⏳ Pendente |
| 11 | Realtime (opcional) | 30min | ⏳ Pendente |
| 12 | Limpeza | 30min | ⏳ Pendente |

**Total:** ~6-7 horas

---

## 🚨 TROUBLESHOOTING

### Problema: "SUPABASE_SERVICE_KEY não configurado"
**Solução:**
1. Ir no Supabase Dashboard → Settings → API
2. Copiar a chave `service_role` (não a `anon`)
3. Colar em `backend/.env`

### Problema: "new row violates row-level security policy"
**Causa:** Backend usando anon key em vez de service_role
**Solução:** Verificar `backend/src/config/supabase.js` usa `SUPABASE_SERVICE_KEY`

### Problema: "Device não encontrado" após criar
**Causa:** Frontend enviando ID numérico, banco espera UUID
**Solução:** Verificar se schemas validam UUID (Fase 6)

### Problema: "Token inválido" após login
**Causa:** Middleware ainda validando JWT antigo
**Solução:** Completar Fase 3.3 (migrar auth middleware)

### Problema: Gráficos não atualizam em tempo real
**Solução:** Verificar se WebSocket/Realtime está configurado (Fase 11)

---

## 📝 NOTAS IMPORTANTES

1. ⚠️ **Backup antes de começar:**
   ```bash
   git checkout -b backup-sqlite
   git push origin backup-sqlite
   git checkout supabase-migration
   ```

2. ⚠️ **Testar cada fase antes de prosseguir** - não pule fases

3. ⚠️ **Service role key é CRÍTICA:**
   - Backend DEVE usar service_role
   - Frontend DEVE usar anon
   - NUNCA commitar service_role no Git

4. ⚠️ **Admin inicial:**
   - Criar manualmente via Supabase Dashboard
   - Atualizar role via SQL depois

5. ✅ **Vantagens após migração:**
   - Banco persistente (não reseta ao reiniciar)
   - RLS automático (segurança)
   - Realtime nativo
   - Escalável para produção
   - Backup automático

---

## 🎯 COMEÇAR AGORA

**Pronto para iniciar?**

Marque o primeiro checkbox da Fase 0 e siga em ordem. Cada fase depende da anterior.

**Boa sorte! 🚀**
