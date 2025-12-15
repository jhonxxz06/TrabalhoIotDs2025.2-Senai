# 📅 Linha do Tempo - Implementações do IoT Dashboard

## 🗓️ Dezembro 4, 2025

### Backend - Estrutura Inicial
- ✅ Configuração inicial do projeto Node.js/Express
- ✅ Implementação do banco de dados SQLite com sql.js
- ✅ Sistema de autenticação JWT (login/register)
- ✅ CRUD completo de usuários e dispositivos
- ✅ Sistema de permissões (admin/user)
- ✅ Relacionamento N:N entre usuários e dispositivos
- ✅ Sistema de solicitação de acesso a dispositivos

### Frontend - Base React
- ✅ Estrutura inicial do projeto React
- ✅ Sistema de autenticação (Login/Register)
- ✅ Páginas administrativas e de usuário
- ✅ Gerenciamento de dispositivos
- ✅ Sistema de notificações de acesso

### Widgets e Gráficos
- ✅ CRUD de widgets (gráficos)
- ✅ Integração com Chart.js
- ✅ Editor de gráficos com templates pré-definidos
- ✅ Suporte para gráficos: linha, barra, pizza, rosca

---

## 🗓️ Dezembro 5, 2025

### Manhã - Refatoração de Gráficos
- ✅ Remoção de mock charts hardcoded (DEFAULT_BAR_DATA, DEFAULT_PIE_DATA, DEFAULT_LINE_DATA)
- ✅ Criação do componente `DynamicWidgetCard` para admin
- ✅ Criação do componente `DynamicWidget` para usuários
- ✅ Implementação de estado vazio (empty state UI)
- ✅ Correção do CRUD de widgets (formato name/type/deviceId/config)

### Tarde - Integração MQTT
- ✅ Implementação do serviço MQTT (`mqtt.service.js`)
- ✅ Conexão com broker HiveMQ (broker.hivemq.com)
- ✅ Armazenamento de dados MQTT no banco (`mqtt_data` table)
- ✅ API para buscar dados históricos MQTT
- ✅ Auto-refresh dos gráficos (polling a cada 5 segundos)

### Noite - Melhorias MQTT e UX
- ✅ Implementação de `mqttField` e `mqttField2` no editor de widgets
- ✅ Modo visual vs JSON no GraphEditorModal
- ✅ Seleção de campos do payload MQTT (ex: temperature, humidity)
- ✅ Suporte para múltiplos datasets no mesmo gráfico
- ✅ Detecção automática de campos numéricos no payload
- ✅ Remoção do botão "Conectar MQTT" (conexão automática)
- ✅ Remoção do indicador "live" (🟢) e botão de refresh
- ✅ Correção do ícone Excel duplicado

### Configuração MQTT
- ✅ Implementação de `mqtt.js` para auto-inicialização
- ✅ Conexões MQTT automáticas ao iniciar backend
- ✅ Suporte para QoS 1
- ✅ Logs detalhados de mensagens MQTT
- ✅ Compatibilidade com testclient-cloud.mqtt.cool (protocolo TCP)

### Features Avançadas
- ✅ Auto-conexão MQTT ao criar novo dispositivo
- ✅ Reconexão automática ao atualizar dispositivo
- ✅ Desconexão MQTT ao excluir dispositivo
- ✅ Suporte simultâneo para múltiplos dispositivos MQTT
- ✅ Isolamento de dados por device_id

### Debugging e Testes
- ✅ Scripts de teste MQTT (posteriormente removidos)
- ✅ Verificação de dados no banco SQLite
- ✅ Teste de conexão WebSocket vs TCP
- ✅ Validação de topicos e payloads

### Arquivos Removidos (Limpeza)
- ❌ `test-mqtt-connection.js`
- ❌ `test-mqtt-topic.js`
- ❌ `mqtt-test.js`
- ❌ `send-test.js`

---

## 📊 Estatísticas do Projeto

### Backend
- **Arquivos principais**: 15+
- **Controllers**: 6 (auth, user, device, widget, access, mqtt)
- **Models**: 4 (User, Device, Widget, AccessRequest)
- **Services**: 1 (mqtt.service)
- **Routes**: 6 módulos

### Frontend
- **Componentes React**: 20+
- **Páginas principais**: 5 (Login, Register, Admin, Dashboard, Devices)
- **Modais**: 4 (DeviceForm, GraphEditor, RequestAccess, UserManagement)

### Funcionalidades
- ✅ Autenticação e autorização JWT
- ✅ Gerenciamento de usuários e permissões
- ✅ CRUD completo de dispositivos IoT
- ✅ Sistema de widgets/gráficos personalizáveis
- ✅ Integração MQTT em tempo real
- ✅ Visualização de dados históricos
- ✅ Sistema de solicitação de acesso
- ✅ Suporte para múltiplos dispositivos simultâneos
- ✅ Auto-refresh de dados (5 segundos)
- ✅ Download de dados em Excel

---

## 🚀 Próximas Melhorias Sugeridas

### Performance
- [ ] Implementar WebSocket para updates em tempo real (substituir polling)
- [ ] Cache de dados MQTT mais inteligente
- [ ] Paginação para dados históricos

### Features
- [ ] Dashboard com múltiplos widgets por página
- [ ] Alertas e notificações baseados em thresholds
- [ ] Exportação de gráficos em imagem (PNG/SVG)
- [ ] Histórico de ações (audit log)
- [ ] Temas claro/escuro

### Segurança
- [ ] Rate limiting nas APIs
- [ ] Criptografia de senhas MQTT no banco
- [ ] 2FA (autenticação de dois fatores)
- [ ] Logs de auditoria de segurança

---

## 📝 Notas Técnicas

### Stack Tecnológica
- **Backend**: Node.js, Express.js, sql.js (SQLite), mqtt.js, JWT
- **Frontend**: React, Chart.js, Axios
- **Broker MQTT**: HiveMQ (broker.hivemq.com)
- **Database**: SQLite (arquivo local)

### Formato de Dados MQTT
```json
{
  "temperature": 25.5,
  "humidity": 60
}
```

### Estrutura de Widget
```json
{
  "id": 1,
  "name": "Temperatura",
  "type": "line",
  "deviceId": 5,
  "config": {
    "type": "line",
    "mqttField": "temperature",
    "mqttField2": "humidity",
    "data": { "labels": [], "datasets": [] },
    "options": { "responsive": true }
  }
}
```

### Arquitetura MQTT
- **Porta TCP**: 1883 (backend e ESP32)
- **Porta WebSocket**: 8000 (clientes web)
- **Tópico padrão**: `iot/teste/sensor1`
- **QoS**: 1 (entrega garantida)

---

**Desenvolvido por**: GitHub Copilot (Claude Sonnet 4.5)  
**Período**: 4-5 de Dezembro, 2025
