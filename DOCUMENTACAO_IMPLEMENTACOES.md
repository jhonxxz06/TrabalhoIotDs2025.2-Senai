# 📘 Documentação Completa - Implementações de Melhorias

**Data:** 12 de Dezembro de 2025  
**Projeto:** IoT Dashboard - Clear Air SENAI  
**Branch:** `supabase-migration`  
**Implementações:** #2, #3 e #4

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [#2 - Validação JSONB](#2---validação-jsonb)
3. [#3 - Device com Admin Obrigatório](#3---device-com-admin-obrigatório)
4. [#4 - Configuração service_role](#4---configuração-service_role)
5. [Arquivos Criados/Modificados](#arquivos-criadosmodificados)
6. [Como Testar](#como-testar)
7. [Troubleshooting](#troubleshooting)
8. [Próximos Passos](#próximos-passos)

---

## 🎯 Visão Geral

Este documento detalha **3 melhorias críticas** implementadas no projeto IoT Dashboard para aumentar a segurança, robustez e confiabilidade do sistema.

### **Resumo das Implementações:**

| # | Melhoria | Prioridade | Tempo | Status |
|---|----------|------------|-------|--------|
| #2 | Validação JSONB (config/position) | 🟡 Alta | ~15min | ✅ Completo |
| #3 | Device com pelo menos 1 admin | 🟡 Média | ~10min | ✅ Completo |
| #4 | Configuração service_role correta | 🔴 Crítica | ~5min | ✅ Completo |

**Total:** ~30 minutos de implementação

---

## #2 - Validação JSONB

### 📌 **Problema Identificado:**

Os campos `config` e `position` dos widgets aceitavam **qualquer JSON**, sem validação de estrutura ou limites de valores. Isso poderia causar:

- ❌ UI quebrada se JSON malformado
- ❌ Valores absurdos (ex: `x: -9999`, `width: 999999`)
- ❌ Erros silenciosos no Chart.js
- ❌ Dados inconsistentes no banco

### ✅ **Solução Implementada:**

Adicionamos **schemas de validação detalhados** usando Zod para garantir que os dados JSON estejam sempre no formato correto.

---

### 📝 **Arquivo Modificado:**

**`backend/src/schemas/widget.schema.js`**

#### **Antes:**
```javascript
const createWidgetSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  deviceId: z.number().int().positive(),
  config: z.record(z.any()).optional().default({}), // ❌ Aceita qualquer coisa
  position: z.record(z.any()).optional().default({}) // ❌ Aceita qualquer coisa
});
```

#### **Depois:**
```javascript
// ✅ VALIDAÇÃO DETALHADA DE CONFIG JSONB
const configSchema = z.object({
  mqttField: z.string().max(100).optional(),
  mqttField2: z.string().max(100).optional(),
  data: z.object({
    labels: z.array(z.string()).optional(),
    datasets: z.array(z.any()).optional()
  }).optional(),
  options: z.any().optional(),
  type: z.string().optional()
}).passthrough(); // Permite campos extras para flexibilidade

// ✅ VALIDAÇÃO DETALHADA DE POSITION JSONB
const positionSchema = z.object({
  x: z.number().int().min(0).max(10000).optional(),
  y: z.number().int().min(0).max(10000).optional(),
  width: z.number().int().min(1).max(2000).optional(),
  height: z.number().int().min(1).max(2000).optional()
}).passthrough(); // Permite campos extras

const createWidgetSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  type: z.string().min(1, 'Tipo é obrigatório'),
  deviceId: z.number().int().positive('Device ID inválido'),
  config: configSchema.optional().default({}),
  position: positionSchema.optional().default({})
});
```

---

### 🔍 **Detalhes da Validação:**

#### **Config Schema:**
- `mqttField`: String opcional, máximo 100 caracteres
- `mqttField2`: String opcional, máximo 100 caracteres
- `data`: Objeto opcional com `labels` (array) e `datasets` (array)
- `options`: Qualquer tipo (flexibilidade para Chart.js)
- `type`: String opcional
- `.passthrough()`: Permite campos extras não especificados

#### **Position Schema:**
- `x`: Número inteiro, 0 ≤ x ≤ 10000
- `y`: Número inteiro, 0 ≤ y ≤ 10000
- `width`: Número inteiro, 1 ≤ width ≤ 2000
- `height`: Número inteiro, 1 ≤ height ≤ 2000
- `.passthrough()`: Permite campos extras

---

### ✅ **Benefícios:**

1. **Previne dados inválidos** - JSON malformado é rejeitado antes de salvar
2. **Erros claros** - Mensagens de erro específicas do Zod
3. **UI estável** - Chart.js sempre recebe dados consistentes
4. **Limites sensatos** - Evita valores absurdos (ex: widget fora da tela)
5. **Flexibilidade** - `.passthrough()` permite campos futuros

---

### 🧪 **Como Testar:**

#### **Teste 1: Position inválido**
```bash
POST http://localhost:3001/api/widgets
Content-Type: application/json

{
  "name": "Widget Teste",
  "type": "line",
  "deviceId": 1,
  "position": {
    "x": -100,     // ❌ Erro: deve ser >= 0
    "y": 20000,    // ❌ Erro: deve ser <= 10000
    "width": 0     // ❌ Erro: deve ser >= 1
  }
}
```

**Resposta esperada:**
```json
{
  "success": false,
  "error": "Dados inválidos",
  "details": [
    {
      "path": ["position", "x"],
      "message": "Number must be greater than or equal to 0"
    },
    {
      "path": ["position", "y"],
      "message": "Number must be less than or equal to 10000"
    },
    {
      "path": ["position", "width"],
      "message": "Number must be greater than or equal to 1"
    }
  ]
}
```

#### **Teste 2: Config válido**
```bash
POST http://localhost:3001/api/widgets
Content-Type: application/json

{
  "name": "Temperatura",
  "type": "line",
  "deviceId": 1,
  "config": {
    "mqttField": "temperature",
    "mqttField2": "humidity",
    "data": {
      "labels": ["00:00", "01:00", "02:00"],
      "datasets": []
    }
  },
  "position": {
    "x": 50,
    "y": 30,
    "width": 350,
    "height": 280
  }
}
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Widget criado com sucesso",
  "widget": { ... }
}
```

---

## #3 - Device com Admin Obrigatório

### 📌 **Problema Identificado:**

Um device poderia ficar sem nenhum administrador vinculado se:

1. Admin criasse device sem atribuir usuários
2. Admin removesse a si mesmo da lista de usuários
3. Único admin do device fosse desvinculado

**Resultado:** Device "órfão" sem ninguém poder gerenciar.

### ✅ **Solução Implementada:**

Garantimos que **todo device sempre tenha pelo menos 1 administrador** vinculado, tanto na criação quanto na atualização.

---

### 📝 **Arquivo Modificado:**

**`backend/src/controllers/device.controller.js`**

---

### 🔧 **Modificação 1: Método `create`**

#### **Código Adicionado:**
```javascript
// ✅ VALIDAÇÃO #3: Garantir que device tenha pelo menos 1 admin
if (assignedUsers && assignedUsers.length > 0) {
  const User = require('../models/User');
  const hasAdmin = assignedUsers.some(userId => {
    const user = User.findById(userId);
    return user && user.role === 'admin';
  });

  if (!hasAdmin) {
    // Se não tem admin, adicionar o próprio usuário (que é admin)
    if (!assignedUsers.includes(req.user.id)) {
      assignedUsers.push(req.user.id);
    }
  }

  Device.setAssignedUsers(device.id, assignedUsers);
} else {
  // Se não informou usuários, atribuir o próprio admin criador
  Device.setAssignedUsers(device.id, [req.user.id]);
}
```

#### **Lógica:**
1. Se `assignedUsers` foi informado:
   - Verifica se algum é admin
   - Se nenhum for admin → adiciona o criador (que é admin)
2. Se `assignedUsers` não foi informado:
   - Atribui automaticamente o admin criador

**Resultado:** Device **SEMPRE** tem pelo menos 1 admin.

---

### 🔧 **Modificação 2: Método `update`**

#### **Código Adicionado:**
```javascript
// ✅ VALIDAÇÃO #3: Atualiza usuários garantindo pelo menos 1 admin
if (assignedUsers !== undefined) {
  if (assignedUsers.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Device deve ter pelo menos um administrador atribuído'
    });
  }

  const User = require('../models/User');
  const hasAdmin = assignedUsers.some(userId => {
    const user = User.findById(userId);
    return user && user.role === 'admin';
  });

  if (!hasAdmin) {
    return res.status(400).json({
      success: false,
      message: 'Pelo menos um administrador deve estar vinculado ao device'
    });
  }

  Device.setAssignedUsers(id, assignedUsers);
}
```

#### **Lógica:**
1. Se `assignedUsers` foi informado:
   - Verifica se array está vazio → retorna erro 400
   - Verifica se algum é admin → se não, retorna erro 400
   - Se passou nas validações → atualiza

**Resultado:** Impossível remover todos os admins de um device.

---

### ✅ **Benefícios:**

1. **Devices nunca órfãos** - Sempre tem um responsável
2. **Admin não pode se remover sozinho** - Se for o único admin
3. **Erros claros** - Mensagens específicas de validação
4. **Prevenção de problemas** - Evita device sem gerenciamento

---

### 🧪 **Como Testar:**

#### **Teste 1: Criar device sem informar usuários**
```bash
POST http://localhost:3001/api/devices
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Sensor Sala 1",
  "mqttBroker": "broker.hivemq.com",
  "mqttPort": "1883",
  "mqttTopic": "iot/sala1"
  // ✅ Não informou assignedUsers
}
```

**Resultado esperado:**
```json
{
  "success": true,
  "device": {
    "id": 5,
    "name": "Sensor Sala 1",
    "assignedUsers": [1] // ✅ Admin criador foi atribuído automaticamente
  }
}
```

---

#### **Teste 2: Criar device com usuários não-admin**
```bash
POST http://localhost:3001/api/devices
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Sensor Sala 2",
  "mqttBroker": "broker.hivemq.com",
  "mqttPort": "1883",
  "mqttTopic": "iot/sala2",
  "assignedUsers": [2, 3] // Usuários comuns (não admin)
}
```

**Resultado esperado:**
```json
{
  "success": true,
  "device": {
    "id": 6,
    "name": "Sensor Sala 2",
    "assignedUsers": [1, 2, 3] // ✅ Admin criador (1) foi adicionado automaticamente
  }
}
```

---

#### **Teste 3: Tentar atualizar removendo todos os admins**
```bash
PUT http://localhost:3001/api/devices/5
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "assignedUsers": [2, 3] // Apenas usuários comuns (nenhum admin)
}
```

**Resultado esperado:**
```json
{
  "success": false,
  "message": "Pelo menos um administrador deve estar vinculado ao device"
}
```

Status: **400 Bad Request**

---

#### **Teste 4: Tentar atualizar com array vazio**
```bash
PUT http://localhost:3001/api/devices/5
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "assignedUsers": [] // Array vazio
}
```

**Resultado esperado:**
```json
{
  "success": false,
  "message": "Device deve ter pelo menos um administrador atribuído"
}
```

Status: **400 Bad Request**

---

## #4 - Configuração service_role

### 📌 **Problema Identificado:**

A configuração do Supabase precisa ser **diferente** no backend e no frontend:

- **Backend:** Usa `service_role` key (ignora RLS, acesso total)
- **Frontend:** Usa `anon` key (limitado por RLS)

**Se configurar errado:**
- ❌ Backend não consegue inserir dados MQTT (policy bloqueia)
- ❌ Frontend com service_role = DESASTRE DE SEGURANÇA
- ❌ Logs confusos sem saber qual key está usando

### ✅ **Solução Implementada:**

Criamos **2 arquivos de configuração separados** com validações obrigatórias e logs claros.

---

### 📁 **Arquivos Criados:**

#### **1. Backend - `backend/src/config/supabase.js`**

```javascript
// ============================================
// ✅ CONFIGURAÇÃO SUPABASE - BACKEND (#4)
// ============================================
// CRÍTICO: Usar SERVICE_ROLE key no backend!
// Esta chave IGNORA RLS e tem acesso total.
// NUNCA expor esta chave no frontend!

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// ✅ Validação obrigatória
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO CRÍTICO: SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios!');
  console.error('Configure no arquivo .env:');
  console.error('  SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('  SUPABASE_SERVICE_KEY=eyJ... (service_role key)');
  process.exit(1);
}

// ✅ Cliente Supabase para backend (usa service_role)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Log de inicialização
console.log('✅ Supabase configurado (service_role)');
console.log(`📡 URL: ${supabaseUrl}`);

module.exports = { supabase };
```

**Características:**
- ✅ Usa `SUPABASE_SERVICE_KEY` (service_role)
- ✅ Valida variáveis obrigatoriamente
- ✅ `process.exit(1)` se não configurar
- ✅ Auth desabilitada (backend não precisa sessão)
- ✅ Logs informativos

---

#### **2. Frontend - `frontend/teste-mcp/src/config/supabase.js`**

```javascript
// ============================================
// ✅ CONFIGURAÇÃO SUPABASE - FRONTEND (#4)
// ============================================
// CRÍTICO: Usar ANON key no frontend!
// Esta chave é PÚBLICA e limitada por RLS.
// Nunca use service_role key no frontend!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// ✅ Validação
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERRO: SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios!');
  console.error('Configure no arquivo .env:');
  console.error('  REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('  REACT_APP_SUPABASE_ANON_KEY=eyJ... (anon key)');
}

// ✅ Cliente Supabase para frontend (usa anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Log de inicialização
console.log('✅ Supabase configurado (anon key)');
console.log(`📡 URL: ${supabaseUrl}`);
```

**Características:**
- ✅ Usa `REACT_APP_SUPABASE_ANON_KEY` (anon)
- ✅ Valida variáveis
- ✅ Auth habilitada (persistência de sessão)
- ✅ Logs informativos
- ⚠️ **NÃO** usa `process.exit()` (não travar o app)

---

### 📄 **Templates de Configuração:**

#### **Backend `.env.example`**

```env
# ============================================
# CONFIGURAÇÃO DO BACKEND - IoT Dashboard
# ============================================

# Servidor
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=sua_chave_super_secreta_mude_em_producao
JWT_EXPIRES_IN=24h

# ✅ SUPABASE - BACKEND (#4)
# ⚠️ CRÍTICO: Use service_role key (NUNCA expor no frontend!)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MQTT (legado - se ainda usar)
MQTT_BROKER=mqtt://broker.hivemq.com:1883

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003

# Logs (opcional)
LOG_LEVEL=debug
```

---

#### **Frontend `.env.example`**

```env
# ============================================
# CONFIGURAÇÃO DO FRONTEND - IoT Dashboard
# ============================================

# ✅ SUPABASE - FRONTEND (#4)
# ⚠️ Use anon key (chave pública, segura para expor)
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API (opcional - se ainda usar backend REST)
REACT_APP_API_URL=http://localhost:3001

# Ambiente
REACT_APP_ENV=development
```

---

### 🔐 **Diferenças entre as Keys:**

| Aspecto | service_role (Backend) | anon (Frontend) |
|---------|------------------------|-----------------|
| **Ignora RLS?** | ✅ Sim | ❌ Não |
| **Permissões** | Acesso total | Limitado por policies |
| **Onde usar** | Apenas backend | Apenas frontend |
| **Pode expor?** | ❌ NUNCA | ✅ Sim (pública) |
| **Uso típico** | Insert MQTT, admin tasks | Login, SELECT user data |
| **Auth** | Desabilitada | Habilitada |

---

### ✅ **Benefícios:**

1. **Segurança crítica** - service_role nunca exposta
2. **Backend pode inserir MQTT** - Ignora policy de RLS
3. **Frontend seguro** - Limitado por RLS
4. **Validação obrigatória** - App não inicia sem configurar
5. **Logs claros** - Sabe qual key está usando
6. **Templates documentados** - `.env.example` explica tudo

---

### 🧪 **Como Testar:**

#### **Teste 1: Backend sem configurar (deve dar erro)**
```bash
# Não configurar .env
cd backend
npm start
```

**Resultado esperado:**
```
❌ ERRO CRÍTICO: SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios!
Configure no arquivo .env:
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_SERVICE_KEY=eyJ... (service_role key)
[processo encerrado]
```

---

#### **Teste 2: Backend configurado corretamente**
```bash
# Configurar backend/.env:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service_role)

cd backend
npm start
```

**Resultado esperado:**
```
✅ Supabase configurado (service_role)
📡 URL: https://xxxxx.supabase.co
🚀 Servidor rodando em http://localhost:3001
```

---

#### **Teste 3: Inserir dados MQTT (deve funcionar)**
```javascript
// backend/src/services/mqtt.service.js
const { supabase } = require('../config/supabase');

async saveData(deviceId, topic, payload) {
  const { data, error } = await supabase
    .from('mqtt_data')
    .insert({
      device_id: deviceId,
      topic,
      payload: JSON.parse(payload),
      received_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('[MQTT] Erro ao salvar:', error);
    throw error;
  }
  
  console.log('✅ Dados MQTT salvos:', data);
  return data;
}
```

**Resultado esperado:**
```
✅ Dados MQTT salvos: [{ id: 'uuid...', device_id: '...', ... }]
```

**OBS:** Se usar `anon_key` no backend, a policy bloquearia com erro:
```
❌ new row violates row-level security policy for table "mqtt_data"
```

---

#### **Teste 4: Frontend com anon key**
```javascript
// frontend/src/config/supabase.js
import { supabase } from './config/supabase';

// Login funciona
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@test.com',
  password: 'senha123'
});

console.log('✅ Login bem-sucedido:', data.user);

// SELECT funciona (limitado por RLS)
const { data: devices } = await supabase
  .from('devices')
  .select('*');

console.log('✅ Devices visíveis:', devices);

// INSERT em mqtt_data NÃO funciona (policy bloqueia)
const { error: insertError } = await supabase
  .from('mqtt_data')
  .insert({ device_id: '...', topic: 'test', payload: {} });

console.error('❌ Bloqueado por RLS:', insertError); 
// new row violates row-level security policy
```

---

### 📍 **Onde pegar as keys no Supabase:**

1. Acesse seu projeto no Supabase Dashboard
2. Vá em **Settings** → **API**
3. Na seção **Project API keys**, você verá:
   - **`anon` / `public`** → Use no frontend
   - **`service_role`** → Use no backend
4. Copie e cole nos arquivos `.env` correspondentes

**⚠️ IMPORTANTE:**
- `anon` key pode ser commitada no git (é pública)
- `service_role` key **NUNCA** deve ser exposta ou commitada

---

## 📂 Arquivos Criados/Modificados

### **Arquivos Modificados:**

```
backend/
├── src/
│   ├── controllers/
│   │   └── device.controller.js  ← Modificado (#3)
│   └── schemas/
│       └── widget.schema.js       ← Modificado (#2)
└── .env.example                   ← Atualizado (#4)
```

### **Arquivos Criados:**

```
backend/
└── src/
    └── config/
        └── supabase.js            ← NOVO (#4)

frontend/
└── teste-mcp/
    ├── src/
    │   └── config/
    │       └── supabase.js        ← NOVO (#4)
    └── .env.example               ← NOVO (#4)
```

### **Documentação:**

```
IMPLEMENTACOES_MELHORIAS.md        ← NOVO (este arquivo)
```

---

## 🧪 Como Testar

### **Setup Inicial:**

#### **1. Configurar variáveis de ambiente:**

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service_role key)
JWT_SECRET=sua_chave_jwt_super_secreta
PORT=3001
```

**Frontend** (`frontend/teste-mcp/.env`):
```env
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGc... (anon key)
```

#### **2. Instalar dependências:**

```bash
# Backend
cd backend
npm install @supabase/supabase-js

# Frontend
cd frontend/teste-mcp
npm install @supabase/supabase-js
```

#### **3. Executar SQL no Supabase:**

Copie e execute o **SQL FINAL DEFINITIVO** (fornecido anteriormente) no SQL Editor do Supabase.

---

### **Testes Funcionais:**

#### **Teste #2 - Validação JSONB:**

```bash
# Teste com dados inválidos (deve dar erro)
curl -X POST http://localhost:3001/api/widgets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste",
    "type": "line",
    "deviceId": 1,
    "position": {
      "x": -100,
      "y": 20000,
      "width": 0
    }
  }'

# Resultado esperado: 400 Bad Request com detalhes do Zod
```

#### **Teste #3 - Device com admin:**

```bash
# Criar device sem usuários (deve atribuir você)
curl -X POST http://localhost:3001/api/devices \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sensor 1",
    "mqttBroker": "broker.hivemq.com",
    "mqttTopic": "test/topic"
  }'

# Resultado esperado: assignedUsers contém você

# Tentar remover todos admins (deve dar erro)
curl -X PUT http://localhost:3001/api/devices/1 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "assignedUsers": [2, 3]
  }'

# Resultado esperado: 400 Bad Request
```

#### **Teste #4 - service_role:**

```javascript
// Backend - deve funcionar
const { supabase } = require('./config/supabase');

const { data, error } = await supabase
  .from('mqtt_data')
  .insert({ device_id: 'uuid...', topic: 'test', payload: {} });

console.log('✅ Inserido:', data);
```

---

## 🐛 Troubleshooting

### **Problema 1: "SUPABASE_URL não configurado"**

**Erro:**
```
❌ ERRO CRÍTICO: SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios!
```

**Solução:**
1. Criar arquivo `.env` na raiz do backend
2. Copiar conteúdo de `.env.example`
3. Preencher com valores reais do Supabase

---

### **Problema 2: "new row violates row-level security policy"**

**Erro ao inserir em `mqtt_data`:**
```
error: new row violates row-level security policy for table "mqtt_data"
```

**Causas possíveis:**
1. ❌ Usando `anon_key` no backend (deveria usar `service_role`)
2. ❌ Policy `mqtt_data_insert_service` não foi criada
3. ❌ RLS está desabilitado

**Solução:**
1. Verificar `backend/src/config/supabase.js` usa `SUPABASE_SERVICE_KEY`
2. Executar SQL completo no Supabase (incluindo policy)
3. Verificar se RLS está habilitado: `ALTER TABLE mqtt_data ENABLE ROW LEVEL SECURITY;`

---

### **Problema 3: Validação Zod não funciona**

**Widget criado com dados inválidos:**

**Causas possíveis:**
1. ❌ Middleware de validação não está aplicado na rota
2. ❌ Schema não está sendo usado no controller

**Solução:**
1. Verificar se route usa `validateMiddleware`:
```javascript
router.post('/', authMiddleware, validateMiddleware(createWidgetSchema), create);
```

2. Se não usar middleware, validar manualmente:
```javascript
const validated = createWidgetSchema.parse(req.body);
```

---

### **Problema 4: Admin conseguiu se remover do device**

**Admin único removido:**

**Causas possíveis:**
1. ❌ Código de validação não foi aplicado
2. ❌ User.findById() retornou null (user não existe)

**Solução:**
1. Verificar se código de validação está no `device.controller.js`
2. Adicionar log para debug:
```javascript
console.log('Validando admins:', assignedUsers);
const hasAdmin = assignedUsers.some(userId => {
  const user = User.findById(userId);
  console.log(`User ${userId}:`, user);
  return user && user.role === 'admin';
});
console.log('Tem admin?', hasAdmin);
```

---

## 🚀 Próximos Passos

### **1. Configurar Supabase (5 minutos):**

1. ✅ Criar conta no Supabase (se ainda não tem)
2. ✅ Criar novo projeto: `iot-dashboard`
3. ✅ Copiar URL e keys (Settings → API)
4. ✅ Executar SQL completo no SQL Editor
5. ✅ Criar admin manualmente (Authentication → Users)
6. ✅ Inserir profile do admin no SQL

---

### **2. Configurar variáveis (.env) (2 minutos):**

- ✅ `backend/.env` com `SUPABASE_SERVICE_KEY`
- ✅ `frontend/teste-mcp/.env` com `REACT_APP_SUPABASE_ANON_KEY`

---

### **3. Testar as validações (10 minutos):**

- ✅ Teste #2 - Validação JSONB
- ✅ Teste #3 - Device com admin
- ✅ Teste #4 - service_role funciona

---

### **4. Próxima fase - Migração completa (em andamento):**

Após confirmar que as 3 melhorias funcionam, continuaremos com:

1. 🔄 Migrar models para usar Supabase
2. 🔄 Migrar controllers para usar Supabase
3. 🔄 Migrar MQTT service para salvar no Supabase
4. 🔄 Migrar frontend API para usar Supabase direto
5. 🔄 Implementar Realtime nativo (substituir Socket.IO)
6. 🔄 Script de migração de dados (SQLite → Supabase)

---

## 📊 Status das Implementações

| # | Melhoria | Status | Testado | Documentado |
|---|----------|--------|---------|-------------|
| #2 | Validação JSONB | ✅ Implementado | ⏳ Pendente | ✅ Completo |
| #3 | Device com admin | ✅ Implementado | ⏳ Pendente | ✅ Completo |
| #4 | service_role | ✅ Implementado | ⏳ Pendente | ✅ Completo |

**Próximo:** Testar em ambiente real e prosseguir com migração completa para Supabase.

---

## 🔗 Referências

### **Documentação:**
- [Zod Schema Validation](https://zod.dev/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase API Keys](https://supabase.com/docs/guides/api#api-url-and-keys)

### **Arquivos do Projeto:**
- `backend/src/schemas/widget.schema.js` - Validação JSONB
- `backend/src/controllers/device.controller.js` - Validação admin
- `backend/src/config/supabase.js` - Config backend
- `frontend/teste-mcp/src/config/supabase.js` - Config frontend

---

## ✅ Checklist Final

### **Antes de testar:**
- [ ] SQL executado no Supabase
- [ ] Admin criado manualmente
- [ ] Profile do admin inserido
- [ ] `.env` do backend configurado
- [ ] `.env` do frontend configurado
- [ ] Dependências instaladas (`@supabase/supabase-js`)

### **Testes:**
- [ ] Backend inicia sem erro
- [ ] Frontend inicia sem erro
- [ ] Validação JSONB funciona (teste com dados inválidos)
- [ ] Device sempre tem admin (testar criar/atualizar)
- [ ] Backend consegue inserir em `mqtt_data`
- [ ] Frontend **não** consegue inserir em `mqtt_data`

### **Documentação:**
- [x] Código comentado
- [x] `.env.example` atualizado
- [x] README de implementações criado
- [x] Exemplos de teste documentados

---

**Documento criado em:** 12/12/2025  
**Última atualização:** 12/12/2025  
**Versão:** 1.0  
**Autor:** GitHub Copilot (Claude Sonnet 4.5)
