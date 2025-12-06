# 📋 Documentação do Projeto - Sistema de Dashboard

## 🎨 Baseado nos Designs do Figma
**URL do Figma:** [Sem título](https://www.figma.com/design/m2oAp0DLDsevfRFune5D1a/Sem-t%C3%ADtulo)

### Telas Implementadas:
1. **Login** (node-id: 1-1722)
2. **Cadastro** (node-id: 1-1950)
3. **Home User - Aguardando Acesso** (node-id: 1-2039)
4. **Home User - Dispositivos** (node-id: 1-2064)
5. **Dashboard com Gráficos** (node-id: 1-2195)

---

## ✅ Lista de Passos Realizados

### 1. **Acesso ao Design do Figma via MCP**
- [x] Conectado ao Figma via MCP (Model Context Protocol)
- [x] Extraídos dados de 5 frames diferentes
- [x] Analisada estrutura de componentes, cores, tipografia e layout de cada tela

### 2. **Download de Assets**
- [x] Criada pasta `src/assets/` para armazenar imagens
- [x] Imagens baixadas:
  - `background.png` - Imagem de fundo (3000x2000)
  - `logo.png` - Logo da aplicação (1024x1024)
  - `waiting-image.png` - Imagem de espera (1024x1536)
  - `brazil-flag.png` - Bandeira do Brasil (100x100)
  - `excel-icon.png` - Ícone do Excel (509x481)
  - `settings-icon.png` - Ícone de configurações (100x100)

### 3. **Componentes Criados**

#### 📄 LoginPage (Tela de Login)
- [x] Campos de E-mail e Senha
- [x] Botão de Login com loading state
- [x] Link "Criar uma conta"
- [x] Efeito glassmorphism no card
- [x] Animações de entrada

#### 📄 RegisterPage (Tela de Cadastro)
- [x] Campos: Username, E-mail, Senha
- [x] Menu item "Dispositivos" com ícone
- [x] Botão de Cadastro
- [x] Mesma estética do Login

#### 📄 Header (Componente de Cabeçalho)
- [x] Logo centralizado
- [x] Ícone de configurações
- [x] Nome do usuário
- [x] Avatar do usuário

#### 📄 Footer (Componente de Rodapé)
- [x] Barra inferior fixa
- [x] Mesma cor do header

#### 📄 WaitingAccess (Aguardando Acesso)
- [x] Imagem animada flutuante
- [x] Mensagem "Esperando receber acesso..."
- [x] Animação de loading com dots

#### 📄 DevicesPage (Lista de Dispositivos)
- [x] Grid de cards de dispositivos (3x2)
- [x] Ícones de dispositivo
- [x] Animações de hover
- [x] Layout responsivo

#### 📄 DashboardPage (Dashboard com Gráficos)
- [x] Mensagem de boas-vindas
- [x] Nome do dispositivo
- [x] 3 tipos de gráficos (Chart.js):
  - Gráfico de Linha
  - Gráfico de Barras
  - Gráfico de Pizza
- [x] Botões de download Excel
- [x] Layout responsivo

### 4. **Estilos Aplicados (Baseados no Figma)**

#### Paleta de Cores:
| Elemento | Cor |
|----------|-----|
| Header/Footer | `rgba(132, 182, 244, 0.67)` |
| Cards de dispositivo | `rgba(168, 212, 239, 0.61)` |
| Gráfico pizza | `rgba(132, 182, 244, 0.81)` |
| Card glassmorphism | `rgba(217, 217, 217, 0.52)` |
| Campos de texto | `rgba(132, 182, 244, 0.67-0.81)` |
| Menu item | `#BBF5FB` |
| Texto principal | `#000000` |
| Texto secundário | `#49454F` |
| Username (header) | `rgba(255, 255, 255, 0.81)` |

#### Tipografia:
| Estilo | Fonte | Peso | Tamanho |
|--------|-------|------|---------|
| Título grande | Roboto | 500 | 40px |
| Título médio | Roboto | 500 | 24px |
| Botões | Roboto | 500 | 18px |
| Input | Roboto | 400 | 16px |
| Label | Roboto | 400 | 12px |

### 5. **Melhorias Visuais Implementadas**
- [x] **Animações de entrada** - Fade in com movimento
- [x] **Transições hover** - Feedback visual em todos elementos
- [x] **Efeito glassmorphism** - Backdrop blur no card de login/cadastro
- [x] **Responsividade** - Desktop, tablet e mobile
- [x] **Loading states** - Spinners nos botões
- [x] **Microinterações** - Scale, shadow, float
- [x] **Animação de espera** - Dots pulsantes e imagem flutuante

### 6. **Navegação Implementada**
- [x] Login → Cadastro (via link)
- [x] Login → Aguardando Acesso (após login sem permissão)
- [x] Login → Dispositivos (após login com permissão)
- [x] Cadastro → Aguardando Acesso
- [x] Aguardando Acesso → Dispositivos (quando acesso concedido)
- [x] Dispositivos → Dashboard (ao clicar em dispositivo)

### 7. **Integração Chart.js**
- [x] Instalação da biblioteca Chart.js
- [x] Gráfico de linha com área preenchida
- [x] Gráfico de barras
- [x] Gráfico de pizza com legenda
- [x] Configuração para atualização via props (backend)

---

## 📁 Estrutura Final do Projeto

```
src/
├── assets/
│   ├── background.png
│   ├── logo.png
│   ├── waiting-image.png
│   ├── brazil-flag.png
│   ├── excel-icon.png
│   ├── settings-icon.png
│   ├── trash-icon.png          # Admin
│   ├── pencil-icon.png         # Admin
│   ├── add-icon.png            # Admin
│   └── users-icon.png          # Admin
├── components/
│   ├── LoginPage/
│   │   ├── LoginPage.js
│   │   ├── LoginPage.css
│   │   └── index.js
│   ├── RegisterPage/
│   │   ├── RegisterPage.js
│   │   ├── RegisterPage.css
│   │   └── index.js
│   ├── Header/
│   │   ├── Header.js
│   │   ├── Header.css
│   │   └── index.js
│   ├── Footer/
│   │   ├── Footer.js
│   │   ├── Footer.css
│   │   └── index.js
│   ├── WaitingAccess/
│   │   ├── WaitingAccess.js
│   │   ├── WaitingAccess.css
│   │   └── index.js
│   ├── DevicesPage/
│   │   ├── DevicesPage.js
│   │   ├── DevicesPage.css
│   │   └── index.js
│   ├── DashboardPage/
│   │   ├── DashboardPage.js
│   │   ├── DashboardPage.css
│   │   └── index.js
│   ├── AdminHeader/              # Admin
│   │   ├── AdminHeader.js
│   │   ├── AdminHeader.css
│   │   └── index.js
│   ├── AdminDevicesPage/         # Admin
│   │   ├── AdminDevicesPage.js
│   │   ├── AdminDevicesPage.css
│   │   └── index.js
│   ├── AdminDashboardPage/       # Admin
│   │   ├── AdminDashboardPage.js
│   │   ├── AdminDashboardPage.css
│   │   └── index.js
│   ├── DeviceFormModal/          # Admin
│   │   ├── DeviceFormModal.js
│   │   ├── DeviceFormModal.css
│   │   └── index.js
│   └── GraphEditorModal/         # Admin
│       ├── GraphEditorModal.js
│       ├── GraphEditorModal.css
│       └── index.js
├── App.js
├── index.css
├── index.js
└── DOCUMENTACAO.md
```

---

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Instalar Chart.js (necessário para gráficos)
npm install chart.js

# Iniciar servidor de desenvolvimento
npm start
```

O projeto estará disponível em `http://localhost:3000`

---

## 👑 Trilha do Administrador

### Telas Implementadas (Figma):
6. **Admin - Dispositivos** (node-id: 1-2270)
7. **Admin - Dashboard** (node-id: 1-2303)
8. **Admin - Vazio** (node-id: 1-2380)

### Componentes Administrativos

#### 📄 AdminHeader (Cabeçalho do Administrador)
- [x] Logo centralizado
- [x] **Sino de notificações** com badge de contagem
  - Dropdown com requisições de acesso de usuários
  - Botões para aprovar/rejeitar
  - ⚠️ *Funcionalidade completa requer backend*
- [x] **Ícone de adicionar dispositivo** (+) - Abre modal de criação
  - ✅ Aparece **apenas na página de dispositivos**
  - ❌ **Não aparece no dashboard** (corrigido)
- [x] **Ícone de gráfico** - Abre editor JSON de widgets (estilo ThingsBoard)
  - ✅ Aparece **apenas no dashboard**
  - ✅ Estilo normal (não fica "selecionado" permanentemente)
  - ✅ Destaca apenas no hover
- [x] Ícone de home - Navega para página de dispositivos
- [x] Nome de usuário e avatar

#### 📄 AdminDevicesPage (Gerenciar Dispositivos)
- [x] Grid de dispositivos com ações
- [x] Botões de **editar** (lápis) e **excluir** (lixeira) por dispositivo
- [x] Estado vazio com imagem e botão de criar
- [x] Integração com `DeviceFormModal`

#### 📄 AdminDashboardPage (Dashboard Admin)
- [x] Visualização de gráficos do dispositivo
- [x] Integração com `GraphEditorModal`
- [x] Download de dados em Excel
- [x] **Whiteboard estilo Miro** para organização livre dos widgets:
  - Área com fundo pontilhado (grid visual)
  - Widgets posicionados livremente
  - **Drag & Drop funcional** - arraste qualquer widget para mover
  - Cursor muda para "grab" ao passar sobre widget
  - Widget fica destacado durante o arraste
- [x] **Controles de gráfico** (aparecem ao passar o mouse):
  - ✏️ Editar - Abre editor JSON para modificar o gráfico
  - 🗑️ Excluir - Remove o gráfico do dashboard
- [x] ❌ Removido botão "+" do lado do nome do dispositivo

#### 📄 DeviceFormModal (Criar/Editar Dispositivo)
- [x] Campos:
  - Nome do dispositivo
  - **Broker MQTT** (ex: broker.hivemq.com)
  - **Porta MQTT** (ex: 1883)
  - **Tópico MQTT** (ex: sensores/temp/01)
  - Lista de usuários com acesso (checkbox)
- [x] Modos: `create` e `edit`
- [x] Validação de campos obrigatórios

#### 📄 GraphEditorModal (Editor JSON de Widgets)
- [x] **Estilo ThingsBoard** - Configuração via JSON
- [x] Templates pré-definidos:
  - Gráfico de Linha
  - Gráfico de Barras
  - Gráfico de Pizza
  - Gráfico Rosca (Doughnut)
- [x] Editor de código JSON com textarea
- [x] Botão "Formatar" para identar JSON
- [x] Validação de JSON em tempo real
- [x] Mensagens de erro detalhadas
- [x] Estrutura documentada no modal
- [x] Suporte a edição de widgets existentes

### Assets de Admin
- [x] `trash-icon.png` - Ícone de excluir (100x100)
- [x] `pencil-icon.png` - Ícone de editar (100x100)
- [x] `add-icon.png` - Ícone de adicionar (100x100)
- [x] `users-icon.png` - Ícone de usuários (100x100)

---

## ⏳ Funcionalidades Pendentes (Requer Backend)

### Notificações
- [ ] Sincronização de notificações em tempo real
- [ ] Persistência de requisições de acesso no banco
- [ ] Ações de aprovar/rejeitar conectadas à API

### Gráficos Dinâmicos
- [ ] Salvar configuração de widgets no banco
- [ ] Carregar dados reais do MQTT
- [ ] Atualização em tempo real dos gráficos
- [ ] Persistência de posição/layout dos widgets

### Drag & Drop
- [x] ✅ **Implementado!** Widgets movem livremente no whiteboard
- [ ] Persistir posição dos widgets no backend

---

## 🔐 Usuários de Teste

| Email | Senha | Tipo | Acesso |
|-------|-------|------|--------|
| `admin@teste.com` | `admin123` | Admin | ✅ Total |
| `demo@teste.com` | `demo123` | User | ✅ Visualização |
| `user@teste.com` | `user123` | User | ❌ Aguardando |

---

## 📊 Integração MQTT (Preparado para Backend)

### Estrutura do Dispositivo
```javascript
{
  id: 1,
  name: 'Sensor de Temperatura',
  mqttBroker: 'broker.hivemq.com',
  mqttPort: '1883',
  mqttTopic: 'sensores/temp/01',
  assignedUsers: ['user1@email.com', 'user2@email.com']
}
```

### Configuração de Widget (Estilo ThingsBoard)
```json
{
  "type": "line",
  "title": "Temperatura ESP32",
  "dataSource": {
    "topic": "sensores/temp/01",
    "field": "temperature"
  },
  "options": {
    "labels": ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    "datasets": [{
      "label": "Temperatura °C",
      "borderColor": "rgba(132, 182, 244, 1)",
      "fill": true
    }]
  }
}
```

### Conceito do Sistema
Este projeto é um **mini ThingsBoard** focado em:
1. **Receber dados de sensores** via MQTT (ESP32, Arduino, etc.)
2. **Visualizar dados** em dashboards configuráveis
3. **Gerenciar dispositivos** e usuários
4. **Exportar dados** para Excel

---

## 🎯 Trilha do Usuário

```
┌─────────────┐    ┌──────────────┐
│    LOGIN    │───▶│   CADASTRO   │
└─────────────┘    └──────────────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────┐
│     AGUARDANDO ACESSO           │
│  (Esperando permissão admin)    │
└─────────────────────────────────┘
                │
                ▼ (acesso concedido)
┌─────────────────────────────────┐
│     DISPOSITIVOS (GRID)         │
│  ┌────┐ ┌────┐ ┌────┐          │
│  │ D1 │ │ D2 │ │ D3 │          │
│  └────┘ └────┘ └────┘          │
│  ┌────┐ ┌────┐ ┌────┐          │
│  │ D4 │ │ D5 │ │ D6 │          │
│  └────┘ └────┘ └────┘          │
└─────────────────────────────────┘
                │
                ▼ (clique no dispositivo)
┌─────────────────────────────────┐
│     DASHBOARD                   │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ 📈  │ │ 📊  │ │ 🥧  │       │
│  └─────┘ └─────┘ └─────┘       │
│  [Excel] [Excel] [Excel]        │
└─────────────────────────────────┘
```

---

## 👑 Trilha do Administrador (Fluxograma)

```
┌─────────────┐
│    LOGIN    │
│  (Admin)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│     ADMIN DISPOSITIVOS          │
│  ┌────┐ ┌────┐ ┌────┐          │
│  │📱✏️│ │📱✏️│ │📱✏️│          │
│  └────┘ └────┘ └────┘          │
│                                 │
│  [🔔 Notificações] [➕ Add] [📊]│
└─────────────────────────────────┘
       │                   │
       │ (clique device)   │ (criar gráfico)
       ▼                   ▼
┌─────────────────────────────────┐
│     ADMIN DASHBOARD             │
│  ┌─────────────────────────┐   │
│  │   📈 Gráficos (JSON)    │   │
│  │   ✏️ Editar  🗑️ Excluir │   │
│  └─────────────────────────┘   │
│                                 │
│  [➕ Novo Widget via JSON]      │
└─────────────────────────────────┘
```

### Fluxo de Notificações
```
Usuário novo cadastra
       │
       ▼
┌─────────────────────┐
│ Admin recebe alert  │
│ no sino 🔔          │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Admin clica no sino │
│ Vê requisições      │
└─────────────────────┘
       │
   ┌───┴───┐
   ▼       ▼
[✅ Aprovar] [❌ Rejeitar]
```

---

## 📊 Integração com Backend

### Gráficos (Chart.js)
Os dados dos gráficos podem ser atualizados passando props para o componente `DashboardPage`:

```jsx
<DashboardPage 
  barChartData={{
    labels: ['Jan', 'Fev', 'Mar'],
    datasets: [{
      label: 'Consumo',
      data: [10, 20, 30],
      backgroundColor: 'rgba(132, 182, 244, 0.8)'
    }]
  }}
  pieChartData={{...}}
  lineChartData={{...}}
/>
```

### Endpoints Sugeridos

#### Autenticação
- `POST /api/login` - Autenticação
- `POST /api/register` - Cadastro

#### Usuário
- `GET /api/user/access` - Verificar se usuário tem acesso
- `GET /api/devices` - Lista de dispositivos do usuário
- `GET /api/devices/:id/data` - Dados do dispositivo para gráficos
- `GET /api/devices/:id/export` - Download Excel

#### Admin - Usuários
- `GET /api/admin/users/pending` - Usuários aguardando aprovação
- `POST /api/admin/users/:id/approve` - Aprovar acesso
- `POST /api/admin/users/:id/reject` - Rejeitar acesso
- `GET /api/admin/users` - Lista todos os usuários

#### Admin - Dispositivos
- `GET /api/admin/devices` - Lista todos os dispositivos
- `POST /api/admin/devices` - Criar dispositivo
- `PUT /api/admin/devices/:id` - Editar dispositivo
- `DELETE /api/admin/devices/:id` - Excluir dispositivo
- `PUT /api/admin/devices/:id/users` - Atualizar usuários do dispositivo

#### Admin - Widgets/Gráficos
- `GET /api/admin/devices/:id/widgets` - Lista widgets do dispositivo
- `POST /api/admin/devices/:id/widgets` - Criar widget (JSON config)
- `PUT /api/admin/widgets/:id` - Editar widget
- `DELETE /api/admin/widgets/:id` - Excluir widget

#### MQTT (Backend)
- Conexão com broker: `mqtt://broker.hivemq.com:1883`
- Subscribe em tópicos configurados nos dispositivos
- Armazenar dados em banco de dados (InfluxDB ou TimescaleDB recomendado)

---

## 📱 Responsividade

| Breakpoint | Ajustes |
|------------|---------|
| Desktop (> 1024px) | Layout padrão, grid 3 colunas |
| Tablet (768-1024px) | Grid 2 colunas, elementos menores |
| Mobile (< 768px) | Grid 1 coluna, layout compacto |
| Mobile pequeno (< 480px) | Elementos ainda menores |

---

## 🔧 Tecnologias Utilizadas

- **React.js** - Biblioteca de UI
- **Chart.js** - Gráficos interativos
- **CSS3** - Estilização (sem bibliotecas externas)
- **Google Fonts** - Roboto
- **MCP for Figma** - Integração com design

---

*Projeto criado em 01/12/2025*
