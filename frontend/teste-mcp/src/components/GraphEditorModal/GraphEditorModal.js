import React, { useState, useEffect } from 'react';
import './GraphEditorModal.css';

const WIDGET_TEMPLATES = {
  line: {
    type: 'line',
    title: 'Gráfico de Linha',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    },
    data: {
      labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      datasets: [{
        label: 'Valores',
        data: [65, 59, 80, 81, 56, 55, 40],
        fill: true,
        backgroundColor: 'rgba(132, 182, 244, 0.2)',
        borderColor: 'rgba(132, 182, 244, 1)',
        tension: 0.4
      }]
    }
  },
  bar: {
    type: 'bar',
    title: 'Gráfico de Barras',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    },
    data: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      datasets: [{
        label: 'Consumo',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(132, 182, 244, 0.8)',
        borderColor: 'rgba(132, 182, 244, 1)',
        borderWidth: 1
      }]
    }
  },
  pie: {
    type: 'pie',
    title: 'Gráfico de Pizza',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    },
    data: {
      labels: ['Categoria A', 'Categoria B', 'Categoria C', 'Categoria D'],
      datasets: [{
        data: [30, 25, 25, 20],
        backgroundColor: [
          'rgba(132, 182, 244, 0.9)',
          'rgba(168, 212, 239, 0.9)',
          'rgba(187, 245, 251, 0.9)',
          'rgba(100, 150, 200, 0.9)'
        ],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    }
  },
  doughnut: {
    type: 'doughnut',
    title: 'Gráfico Rosca',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    },
    data: {
      labels: ['Ativo', 'Inativo', 'Manutenção'],
      datasets: [{
        data: [60, 25, 15],
        backgroundColor: [
          'rgba(76, 175, 80, 0.8)',
          'rgba(211, 47, 47, 0.8)',
          'rgba(255, 193, 7, 0.8)'
        ],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    }
  }
};

const GraphEditorModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  existingWidget = null
}) => {
  const [mode, setMode] = useState('simple'); // 'simple' ou 'advanced'
  const [jsonCode, setJsonCode] = useState('');
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('line');
  
  // Campos do modo simples
  const [title, setTitle] = useState('');
  const [chartType, setChartType] = useState('line');
  const [mqttField, setMqttField] = useState('');
  const [mqttField2, setMqttField2] = useState('');
  const [useMqttData, setUseMqttData] = useState(true);

  useEffect(() => {
    if (existingWidget) {
      setJsonCode(JSON.stringify(existingWidget, null, 2));
      setTitle(existingWidget.title || '');
      setChartType(existingWidget.type || 'line');
      setMqttField(existingWidget.mqttField || '');
      setMqttField2(existingWidget.mqttField2 || '');
      setUseMqttData(existingWidget.mqttField ? true : false);
      setMode(existingWidget.mqttField ? 'simple' : 'advanced');
    } else {
      setJsonCode('');
      setTitle('');
      setChartType('line');
      setMqttField('temperature');
      setMqttField2('humidity');
      setUseMqttData(true);
      setMode('simple');
    }
    setError('');
    setSelectedTemplate('line');
  }, [existingWidget, isOpen]);

  const handleTemplateSelect = (templateKey) => {
    setSelectedTemplate(templateKey);
    setChartType(templateKey);
    setJsonCode(JSON.stringify(WIDGET_TEMPLATES[templateKey], null, 2));
    setError('');
  };

  const handleCodeChange = (e) => {
    setJsonCode(e.target.value);
    setError('');
  };

  const validateJson = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      if (!parsed.type) {
        setError('O widget deve ter um campo "type" (line, bar, pie, doughnut)');
        return null;
      }
      if (!parsed.data) {
        setError('O widget deve ter um campo "data" com labels e datasets');
        return null;
      }
      return parsed;
    } catch (e) {
      setError('JSON inválido: ' + e.message);
      return null;
    }
  };

  const handleSave = () => {
    if (mode === 'simple') {
      // Criar widget baseado nos campos simples
      const widget = {
        type: chartType,
        title: title || `Gráfico de ${mqttField}`,
        mqttField: mqttField || null,
        mqttField2: mqttField2 || null,
        useMqttData: useMqttData,
        data: {
          labels: [],
          datasets: [{
            label: mqttField || 'Valor',
            data: [],
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          plugins: { legend: { display: true } },
          scales: { y: { beginAtZero: true } }
        }
      };

      // Adicionar segundo dataset se tiver segundo campo
      if (mqttField2) {
        widget.data.datasets.push({
          label: mqttField2,
          data: [],
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
          tension: 0.4
        });
      }

      onSave(widget);
      onClose();
    } else {
      const widget = validateJson();
      if (widget) {
        onSave(widget);
        onClose();
      }
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      setJsonCode(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e) {
      setError('Não foi possível formatar: JSON inválido');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="graph-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3.5 18.49L9.5 12.48L13.5 16.48L22 6.92L20.59 5.51L13.5 13.48L9.5 9.48L2 16.99L3.5 18.49Z" fill="currentColor"/>
            </svg>
            Criar Widget
          </h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Tabs de modo */}
        <div className="mode-tabs">
          <button 
            className={`mode-tab ${mode === 'simple' ? 'active' : ''}`}
            onClick={() => setMode('simple')}
          >
            🚀 Modo Simples
          </button>
          <button 
            className={`mode-tab ${mode === 'advanced' ? 'active' : ''}`}
            onClick={() => setMode('advanced')}
          >
            ⚙️ Modo Avançado (JSON)
          </button>
        </div>

        <div className="editor-content">
          {mode === 'simple' ? (
            <div className="simple-mode">
              <div className="form-group">
                <label>Título do Gráfico</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Temperatura do Sensor"
                />
              </div>

              <div className="form-group">
                <label>Tipo de Gráfico</label>
                <div className="chart-type-buttons">
                  {['line', 'bar', 'pie', 'doughnut'].map(type => (
                    <button
                      key={type}
                      className={`chart-type-btn ${chartType === type ? 'active' : ''}`}
                      onClick={() => setChartType(type)}
                    >
                      {type === 'line' && '📈 Linha'}
                      {type === 'bar' && '📊 Barras'}
                      {type === 'pie' && '🥧 Pizza'}
                      {type === 'doughnut' && '🍩 Rosca'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useMqttData}
                    onChange={(e) => setUseMqttData(e.target.checked)}
                  />
                  Usar dados MQTT do ESP32
                </label>
              </div>

              {useMqttData && (
                <>
                  <div className="form-group">
                    <label>Campo do Payload (1º)</label>
                    <input
                      type="text"
                      value={mqttField}
                      onChange={(e) => setMqttField(e.target.value)}
                      placeholder="Ex: temperature"
                    />
                    <small>Nome do campo no JSON do ESP32. Ex: se envia {"{"}"temperature": 25{"}"}, use "temperature"</small>
                  </div>

                  <div className="form-group">
                    <label>Campo do Payload (2º - opcional)</label>
                    <input
                      type="text"
                      value={mqttField2}
                      onChange={(e) => setMqttField2(e.target.value)}
                      placeholder="Ex: humidity"
                    />
                    <small>Para comparar dois valores no mesmo gráfico</small>
                  </div>
                </>
              )}

              <div className="mqtt-example">
                <h4>💡 Exemplo de Payload MQTT:</h4>
                <code>
                  {"{"}"temperature": 25.5, "humidity": 60{"}"}
                </code>
              </div>
            </div>
          ) : (
            <>
              <div className="templates-section">
                <h3>Templates</h3>
                <div className="template-buttons">
                  {Object.entries(WIDGET_TEMPLATES).map(([key, template]) => (
                    <button
                      key={key}
                      className={`template-btn ${selectedTemplate === key ? 'active' : ''}`}
                      onClick={() => handleTemplateSelect(key)}
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="code-section">
                <div className="code-header">
                  <h3>Código JSON</h3>
                  <button className="format-btn" onClick={formatJson}>
                    Formatar
                  </button>
                </div>
                <textarea
                  className={`code-editor ${error ? 'has-error' : ''}`}
                  value={jsonCode}
                  onChange={handleCodeChange}
                  placeholder='{\n  "type": "line",\n  "title": "Meu Gráfico",\n  "mqttField": "temperature",\n  "data": { ... },\n  "options": { ... }\n}'
                  spellCheck="false"
                />
                {error && <div className="error-message">{error}</div>}
              </div>

              <div className="info-section">
                <h4>Estrutura do Widget</h4>
                <ul>
                  <li><strong>type:</strong> line, bar, pie, doughnut</li>
                  <li><strong>title:</strong> Título do gráfico</li>
                  <li><strong>mqttField:</strong> Campo do payload MQTT (ex: "temperature")</li>
                  <li><strong>data:</strong> Dados do Chart.js (labels, datasets)</li>
                  <li><strong>options:</strong> Configurações do Chart.js</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-save" onClick={handleSave}>
            Salvar Widget
          </button>
        </div>
      </div>
    </div>
  );
};

export default GraphEditorModal;
