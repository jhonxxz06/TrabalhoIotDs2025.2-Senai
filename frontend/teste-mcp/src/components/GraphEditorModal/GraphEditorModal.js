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
  const [thresholds, setThresholds] = useState({});

  useEffect(() => {
    if (existingWidget) {
      setJsonCode(JSON.stringify(existingWidget, null, 2));
      setTitle(existingWidget.title || '');
      setChartType(existingWidget.type || 'line');
      setMqttField(existingWidget.mqttField || '');
      setMqttField2(existingWidget.mqttField2 || '');
      setUseMqttData(existingWidget.mqttField ? true : false);
      setThresholds(existingWidget.thresholds || {});
      setMode(existingWidget.mqttField ? 'simple' : 'advanced');
    } else {
      setJsonCode('');
      setTitle('');
      setChartType('line');
      setMqttField('temperature');
      setMqttField2('humidity');
      setUseMqttData(true);
      setThresholds({});
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
      console.log('🔍 Salvando widget - tipo:', chartType, '| mqttField:', mqttField, '| mqttField2:', mqttField2);
      
      // Se for tabela, criar estrutura diferente
      if (chartType === 'table') {
        // Processar thresholds do state
        const processedThresholds = {};
        
        Object.entries(thresholds).forEach(([field, limits]) => {
          processedThresholds[field] = {
            min: limits.min !== '' && limits.min !== undefined ? parseFloat(limits.min) : undefined,
            max: limits.max !== '' && limits.max !== undefined ? parseFloat(limits.max) : undefined
          };
        });
        
        const widget = {
          type: 'table',
          title: title || 'Tabela de Excedências',
          mqttField: mqttField || null,
          useMqttData: true,
          thresholds: processedThresholds,
          limit: 50
        };
        
        console.log('📋 Widget tabela:', widget);
        console.log('📋 Thresholds:', processedThresholds);
        onSave(widget);
        onClose();
        return;
      }
      
      // Criar datasets baseado APENAS nos campos preenchidos (para gráficos)
      const datasets = [];
      
      // Adicionar primeiro campo se preenchido
      if (mqttField && mqttField.trim() !== '') {
        console.log('✅ Adicionando dataset 1:', mqttField);
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
        console.log('✅ Adicionando dataset 2:', mqttField2);
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
        console.log('⚠️ Nenhum campo preenchido, usando dataset padrão');
        datasets.push({
          label: 'Valor',
          data: [],
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
          tension: 0.4
        });
      }
      
      // Criar widget com datasets dinâmicos
      const widget = {
        type: chartType,
        title: title || `Gráfico de ${mqttField || 'Dados'}`,
        mqttField: mqttField || null,
        mqttField2: mqttField2 || null,
        useMqttData: useMqttData,
        data: {
          labels: [],
          datasets: datasets
        },
        options: {
          plugins: { legend: { display: true } },
          scales: { y: { beginAtZero: true } }
        }
      };

      console.log('📦 Widget final:', widget);
      console.log('📊 Total de datasets:', datasets.length);

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
                  {['line', 'bar', 'pie', 'doughnut', 'table'].map(type => (
                    <button
                      key={type}
                      className={`chart-type-btn ${chartType === type ? 'active' : ''}`}
                      onClick={() => setChartType(type)}
                    >
                      {type === 'line' && '📈 Linha'}
                      {type === 'bar' && '📊 Barras'}
                      {type === 'pie' && '🥧 Pizza'}
                      {type === 'doughnut' && '🍩 Rosca'}
                      {type === 'table' && '📋 Tabela'}
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

              {useMqttData && chartType !== 'table' && (
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

              {useMqttData && chartType === 'table' && (
                <>
                  <div className="form-group">
                    <label>Campos para Monitorar (separados por vírgula)</label>
                    <input
                      type="text"
                      value={mqttField}
                      onChange={(e) => setMqttField(e.target.value)}
                      placeholder="Ex: temperature,humidity,pressure"
                    />
                    <small>Campos do payload que terão thresholds configurados</small>
                  </div>

                  <div className="thresholds-section">
                    <h4>⚠️ Configuração de Limites (Thresholds)</h4>
                    <small style={{ display: 'block', marginBottom: '12px', color: '#666' }}>
                      Configure os valores mínimos e máximos. Deixe em branco para não monitorar aquele limite.
                    </small>
                    {mqttField && mqttField.split(',').filter(f => f.trim()).map(field => {
                      const fieldTrim = field.trim();
                      return (
                        <div key={fieldTrim} className="threshold-config">
                          <label>{fieldTrim}</label>
                          <div className="threshold-inputs">
                            <input
                              type="number"
                              placeholder="Mínimo (ex: 15)"
                              value={thresholds[fieldTrim]?.min ?? ''}
                              onChange={(e) => {
                                setThresholds(prev => ({
                                  ...prev,
                                  [fieldTrim]: {
                                    ...prev[fieldTrim],
                                    min: e.target.value
                                  }
                                }));
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Máximo (ex: 30)"
                              value={thresholds[fieldTrim]?.max ?? ''}
                              onChange={(e) => {
                                setThresholds(prev => ({
                                  ...prev,
                                  [fieldTrim]: {
                                    ...prev[fieldTrim],
                                    max: e.target.value
                                  }
                                }));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
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
