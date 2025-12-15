# 🚀 Guia Rápido: Iniciar o Sistema IoT (SQLite → Neon PostgreSQL)

## Status Final
✅ **Migração Completa do SQLite para Neon.tech PostgreSQL**
✅ **Backend funcionando 100%**
✅ **Dados persistindo corretamente no banco em nuvem**

---

## 📋 Pré-requisitos
- Node.js 18+ instalado
- Conta Neon.tech com banco de dados criado
- Arquivo `.env` no diretório `backend/` configurado

---

## 🔧 Configuração Rápida

### 1. Clone e instale dependências
```bash
cd backend
npm install
```

### 2. Configure o `.env`
```bash
# Arquivo: backend/.env
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-...pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=sua_chave_secreta_aqui
NODE_ENV=development
PORT=3001
MQTT_BROKER=mqtt://broker.hivemq.com
MQTT_PORT=1883
```

### 3. Inicie o Backend
```bash
npm start
```

**Esperado:**
```
✅ Conectado ao banco PostgreSQL com sucesso
✅ Tabelas criadas/verificadas com sucesso
🚀 Servidor rodando em http://localhost:3001
🔌 WebSocket pronto na porta 3001
📡 Health check: http://localhost:3001/api/health
```

---

## 🧪 Testar a API

### Health Check
```bash
curl http://localhost:3001/api/health
```

**Resposta:**
```json
{
  "success": true,
  "message": "API funcionando!",
  "timestamp": "2025-12-14T23:09:51.623Z"
}
```

### Registrar Novo Usuário
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "novouser",
    "email": "novo@example.com",
    "password": "senha123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@teste.com",
    "password": "admin123"
  }'
```

---

## 📱 Frontend

### 1. Instale dependências
```bash
cd frontend/teste-mcp
npm install
```

### 2. Inicie o servidor de desenvolvimento
```bash
npm start
```

O frontend abrirá em `http://localhost:3000`

---

## 🔐 Credenciais Padrão

**Admin:**
- Email: `admin@teste.com`
- Senha: `admin123`

---

## 📊 Banco de Dados (Neon)

Verifique o status do banco:
```bash
cd backend
node check-db.js
```

**Tabelas criadas:**
- `users` - Usuários do sistema
- `devices` - Dispositivos IoT
- `device_users` - Relação N:N de acesso
- `widgets` - Gráficos/widgets
- `access_requests` - Solicitações de acesso
- `mqtt_data` - Dados históricos MQTT

---

## ⚠️ Problemas Comuns

### Servidor não responde
**Solução:** Verifique se a porta 3001 está livre:
```bash
netstat -ano | findstr 3001
```

### Erro de conexão com banco
**Solução:** Verifique o `.env`:
- DATABASE_URL está correto?
- Credenciais do Neon estão corretas?
- Firewall permite acesso ao Neon?

### Erro 401 no login
**Solução:** Verifique se `JWT_SECRET` está configurado no `.env`

---

## 🎯 Próximos Passos

1. Registre novos usuários via frontend
2. Crie dispositivos MQTT
3. Configure widgets/gráficos
4. Teste conexão em tempo real via WebSocket

---

## 📞 Suporte
Para erros, verifique os logs:
```bash
# Terminal do backend mostrará erros em tempo real
npm start
```

**Documentação adicional:**
- [Neon.tech Docs](https://neon.tech/docs)
- [Express.js Docs](https://expressjs.com)
- [Socket.IO Docs](https://socket.io/docs)
