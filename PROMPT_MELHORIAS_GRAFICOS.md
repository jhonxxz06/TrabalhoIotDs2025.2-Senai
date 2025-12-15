# 📊 Prompt de Melhorias - Sistema de Gráficos e Tabelas

## 🎯 Objetivo
Implementar funcionalidades de tabelas com alertas de excedências e corrigir comportamento de campos duplicados nos widgets.

---

## 📋 Requisito 1: Tabela de Excedências (Nova Funcionalidade)

### Descrição
Criar um novo tipo de widget: **Tabela de Alertas/Excedências** que mostra registros onde temperatura ou umidade ultrapassaram limites definidos ( com o admin podendo configurar se quer os dois ou somente um payload).

### Especificações Técnicas

#### Backend (`backend/src/`)

**1. Modelo de Widget Atualizado** (`models/Widget.js`)
- Adicionar suporte para `type: 'table'`
- Campos de configuração:
  ```javascript
  {
    type: 'table',
    thresholds: {
      temperature: { min: 15, max: 30 },
      humidity: { min: 40, max: 80 }
    },
    columns: ['timestamp', 'temperature', 'humidity', 'alert_type']
  }
  ```

**2. Service MQTT** (`services/mqtt.service.js`)
- Criar método `getExceedances(deviceId, thresholds, options)`
- Query SQL:
  ```sql
  SELECT 
    received_at as timestamp,
    payload,
    CASE 
      WHEN json_extract(payload, '$.temperature') > ? THEN 'Temp Alta'
      WHEN json_extract(payload, '$.temperature') < ? THEN 'Temp Baixa'
      WHEN json_extract(payload, '$.humidity') > ? THEN 'Umid Alta'
      WHEN json_extract(payload, '$.humidity') < ? THEN 'Umid Baixa'
    END as alert_type
  FROM mqtt_data
  WHERE device_id = ?
    AND (
      json_extract(payload, '$.temperature') > ? OR
      json_extract(payload, '$.temperature') < ? OR
      json_extract(payload, '$.humidity') > ? OR
      json_extract(payload, '$.humidity') < ?
    )
  ORDER BY received_at DESC
  LIMIT ?
  ```

**3. Controller MQTT** (`controllers/mqtt.controller.js`)
- Adicionar endpoint `GET /api/mqtt/:id/exceedances`
- Parâmetros query: `tempMin`, `tempMax`, `humMin`, `humMax`, `limit`

**4. Rotas** (`routes/mqtt.routes.js`)
```javascript
router.get('/:id/exceedances', auth, mqttController.getExceedances);
```

#### Frontend (`frontend/teste-mcp/src/`)

**1. Componente TableWidget** (`components/TableWidget/TableWidget.js`)
```javascript
// Novo componente para exibir tabela de excedências
const TableWidget = ({ deviceId, config }) => {
  const [exceedances, setExceedances] = useState([]);
  
  // Buscar dados de excedências
  // Renderizar tabela com colunas:
  // - Data/Hora
  // - Temperatura
  // - Umidade
  // - Tipo de Alerta (badge colorido)
  
  return (
    <div className="table-widget">
      <table>
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Temperatura (°C)</th>
            <th>Umidade (%)</th>
            <th>Alerta</th>
          </tr>
        </thead>
        <tbody>
          {exceedances.map(row => (
            <tr key={row.id}>
              <td>{formatDateTime(row.timestamp)}</td>
              <td className={getTemperatureClass(row.temperature)}>
                {row.temperature}
              </td>
              <td className={getHumidityClass(row.humidity)}>
                {row.humidity}
              </td>
              <td>
                <span className={`badge ${row.alert_type}`}>
                  {row.alert_type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

**2. GraphEditorModal Atualizado** (`components/GraphEditorModal/GraphEditorModal.js`)
- Adicionar tipo "table" na seleção de gráficos
- Seção de configuração de thresholds:
  ```jsx
  {chartType === 'table' && (
    <div className="threshold-config">
      <h4>Limites de Temperatura (°C)</h4>
      <input type="number" placeholder="Mínimo" value={tempMin} />
      <input type="number" placeholder="Máximo" value={tempMax} />
      
      <h4>Limites de Umidade (%)</h4>
      <input type="number" placeholder="Mínimo" value={humMin} />
      <input type="number" placeholder="Máximo" value={humMax} />
    </div>
  )}
  ```

**3. API Service** (`services/api.js`)
```javascript
export const mqtt = {
  // ... métodos existentes
  
  getExceedances: (deviceId, thresholds) => 
    api.get(`/mqtt/${deviceId}/exceedances`, { 
      params: thresholds 
    }).then(res => res.data)
};
```

**4. AdminDashboardPage/DashboardPage**
- Renderizar `TableWidget` quando `widget.type === 'table'`
- Exemplo:
  ```jsx
  {widget.type === 'table' ? (
    <TableWidget deviceId={device.id} config={widget.config} />
  ) : (
    <DynamicWidget widget={widget} mqttData={mqttData[widget.id]} />
  )}
  ```

### UI/UX

**Cores de Alerta:**
- 🔴 Temperatura Alta: vermelho (`#ff4444`)
- 🔵 Temperatura Baixa: azul (`#4444ff`)
- 🟡 Umidade Alta: amarelo (`#ffaa00`)
- 🟠 Umidade Baixa: laranja (`#ff6600`)

cores de alertas universais, que sirvam para qualquer payload que vier

**Ícone do Widget Tabela:**
- Usar ícone de tabela/lista no seletor de gráficos
- Label: "📊 Tabela de Alertas"

---

## 🐛 Requisito 2: Corrigir Campos Duplicados nos Gráficos

### Problema Identificado
Ao criar/editar widget com apenas 1 campo do payload (ex: só `temperature`), o sistema está criando 2 datasets no gráfico automaticamente.

### Análise do Bug

**Arquivo Afetado:** `GraphEditorModal.js`

**Trecho Problemático:**
```javascript
// Provavelmente na função handleSave() ou ao criar datasets
datasets: [{
  label: mqttField || 'Valor',
  data: [],
  // ...
}]
```

### Solução

**1. No GraphEditorModal.js** (`components/GraphEditorModal/GraphEditorModal.js`)

Modificar a lógica de criação de datasets:

```javascript
const handleSave = () => {
  if (mode === 'simple') {
    // Criar datasets baseado APENAS nos campos preenchidos
    const datasets = [];
    
    // Adicionar primeiro campo se preenchido
    if (mqttField && mqttField.trim() !== '') {
      datasets.push({
        label: mqttField,
        data: [],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: chartType === 'line',
        tension: 0.4
      });
    }
    
    // Adicionar segundo campo SOMENTE se preenchido
    if (mqttField2 && mqttField2.trim() !== '') {
      datasets.push({
        label: mqttField2,
        data: [],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: chartType === 'line',
        tension: 0.4
      });
    }
    
    // Se nenhum campo foi preenchido, criar dataset padrão
    if (datasets.length === 0) {
      datasets.push({
        label: 'Valor',
        data: [],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
        tension: 0.4
      });
    }
    
    const widget = {
      type: chartType,
      title: title || `Gráfico de ${mqttField || 'Dados'}`,
      mqttField: mqttField || null,
      mqttField2: mqttField2 || null,
      useMqttData: useMqttData,
      data: {
        labels: [],
        datasets: datasets // Usar array dinâmico
      },
      options: {
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    };
    
    onSave(widget);
  } else {
    // Modo JSON
    onSave(JSON.parse(widgetJson));
  }
  onClose();
};
```

**2. No DynamicWidget/DynamicWidgetCard**

Verificar se a atualização dos dados também respeita os campos configurados:

```javascript
// Ao atualizar dados do gráfico
const updateChartData = (mqttData) => {
  if (!widget.useMqttData || !mqttData) return;
  
  const labels = mqttData.map(d => formatTime(d.timestamp));
  const datasets = [];
  
  // Adicionar dataset para mqttField se configurado
  if (widget.mqttField) {
    datasets.push({
      ...widget.data.datasets[0],
      label: widget.mqttField,
      data: mqttData.map(d => {
        const payload = JSON.parse(d.payload || d.data || '{}');
        return payload[widget.mqttField] || 0;
      })
    });
  }
  
  // Adicionar dataset para mqttField2 SOMENTE se configurado
  if (widget.mqttField2) {
    datasets.push({
      ...widget.data.datasets[1],
      label: widget.mqttField2,
      data: mqttData.map(d => {
        const payload = JSON.parse(d.payload || d.data || '{}');
        return payload[widget.mqttField2] || 0;
      })
    });
  }
  
  setChartData({
    labels,
    datasets
  });
};
```

### Testes de Validação

**Cenário 1:** Widget com 1 campo
- Criar widget tipo linha
- Preencher apenas `mqttField` = "temperature"
- Deixar `mqttField2` vazio
- **Resultado esperado:** Gráfico com 1 linha apenas (temperature)

**Cenário 2:** Widget com 2 campos
- Criar widget tipo linha
- Preencher `mqttField` = "temperature"
- Preencher `mqttField2` = "humidity"
- **Resultado esperado:** Gráfico com 2 linhas (temperature + humidity)

**Cenário 3:** Widget sem campos MQTT
- Criar widget tipo barra
- Desmarcar "Usar dados MQTT"
- **Resultado esperado:** Gráfico vazio/template com labels padrão

---

## 📦 Estrutura de Arquivos Novos

```
backend/src/
├── controllers/
│   └── mqtt.controller.js (adicionar getExceedances)
├── services/
│   └── mqtt.service.js (adicionar getExceedances)

frontend/teste-mcp/src/
├── components/
│   ├── TableWidget/
│   │   ├── TableWidget.js (NOVO)
│   │   └── TableWidget.css (NOVO)
│   ├── GraphEditorModal/
│   │   └── GraphEditorModal.js (MODIFICAR)
│   └── DynamicWidget/
│       └── DynamicWidget.js (MODIFICAR - corrigir bug)
└── services/
    └── api.js (adicionar getExceedances)
```

---

## 🎨 Mockup UI - Tabela de Excedências

```
┌─────────────────────────────────────────────────┐
│  📊 Alertas de Temperatura e Umidade            │
├─────────────────────────────────────────────────┤
│  Data/Hora        │ Temp (°C) │ Umid (%) │ Alerta │
├──────────────────┼───────────┼──────────┼────────┤
│  06/12 14:30:15  │   🔴 35.2  │   65.0   │ Temp Alta │
│  06/12 14:15:00  │   23.5    │  🟡 85.0  │ Umid Alta │
│  06/12 13:45:30  │   🔵 12.0  │   55.0   │ Temp Baixa│
│  06/12 13:20:10  │   25.0    │  🟠 35.0  │ Umid Baixa│
└─────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

### Tabela de Excedências
- [ ] Backend: Criar método `getExceedances()` no `mqtt.service.js`
- [ ] Backend: Adicionar controller `getExceedances()` no `mqtt.controller.js`
- [ ] Backend: Adicionar rota `/api/mqtt/:id/exceedances`
- [ ] Frontend: Criar componente `TableWidget.js`
- [ ] Frontend: Criar estilos `TableWidget.css`
- [ ] Frontend: Adicionar tipo "table" no `GraphEditorModal`
- [ ] Frontend: Adicionar campos de threshold no editor
- [ ] Frontend: Integrar `TableWidget` no `AdminDashboardPage`
- [ ] Frontend: Integrar `TableWidget` no `DashboardPage`
- [ ] Frontend: Adicionar método `getExceedances` no `api.js`
- [ ] Teste: Validar alertas de temperatura alta/baixa
- [ ] Teste: Validar alertas de umidade alta/baixa
- [ ] Teste: Validar formatação de data/hora
- [ ] Teste: Validar cores dos badges de alerta

### Correção de Campos Duplicados
- [ ] Identificar função `handleSave()` no `GraphEditorModal.js`
- [ ] Corrigir lógica de criação de datasets (validar campos vazios)
- [ ] Atualizar componente `DynamicWidget` para respeitar campos configurados
- [ ] Atualizar componente `DynamicWidgetCard` para respeitar campos configurados
- [ ] Teste: Widget com 1 campo (só temperature)
- [ ] Teste: Widget com 2 campos (temperature + humidity)
- [ ] Teste: Widget sem campos MQTT (dados estáticos)
- [ ] Teste: Editar widget existente e remover segundo campo

---

## 🚀 Ordem de Implementação Sugerida

1. **Primeiro:** Corrigir bug dos campos duplicados
   - Mais simples e afeta funcionalidade existente
   - Validar testes antes de adicionar novas features

2. **Segundo:** Implementar tabela de excedências
   - Feature nova e independente
   - Pode ser desenvolvida em paralelo após fix do bug

---

## 📝 Observações Importantes

- **SQL do SQLite:** Usar `json_extract(payload, '$.temperature')` para acessar campos JSON
- **Performance:** Considerar índice na coluna `received_at` para queries mais rápidas
- **CSV Export:** A tabela também deve poder ser exportada para CSV
- **Cores:** Manter consistência com tema azul do sistema (#84B6F4)
- **Responsividade:** Tabela deve ter scroll horizontal em mobile

---

**Data de Criação:** 6 de Dezembro de 2025
**Status:** ⏳ Pendente de Implementação
