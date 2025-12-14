import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import './AdminDashboardPage.css';
import AdminHeader from '../AdminHeader';
import Footer from '../Footer';
import GraphEditorModal from '../GraphEditorModal';
import TableWidget from '../TableWidget';
import excelIcon from '../../assets/excel-icon.png';
import { widgets as widgetsApi, mqtt as mqttApi } from '../../services/api';

// Registrar todos os componentes do Chart.js
Chart.register(...registerables);

// Componente para renderizar widgets dinâmicos com dados MQTT
const DynamicWidgetCard = ({ widget, deviceId, position, dragging, onMouseDown, onEdit, onDelete, onDownload }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [mqttData, setMqttData] = useState(null);

  // Buscar dados MQTT
  const fetchMqttData = useCallback(async () => {
    if (!deviceId) return;
    
    try {
      const response = await mqttApi.getData(deviceId, { limit: 20 });
      if (response.success && response.data && response.data.length > 0) {
        setMqttData(response.data);
      }
    } catch (err) {
      console.log('Aguardando dados MQTT...');
    }
  }, [deviceId]);

  // Polling para atualizar dados a cada 5 segundos
  useEffect(() => {
    fetchMqttData();
    const interval = setInterval(fetchMqttData, 5000);
    return () => clearInterval(interval);
  }, [fetchMqttData]);

  // Criar/atualizar gráfico
  useEffect(() => {
    if (!chartRef.current || !widget.config) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    try {
      const config = typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config;
      
      // Se temos dados MQTT, usá-los no gráfico
      let chartData = config.data || { labels: [], datasets: [] };
      
      if (mqttData && mqttData.length > 0 && config.mqttField) {
        console.log('🎨 Renderizando gráfico - mqttField:', config.mqttField, '| mqttField2:', config.mqttField2);
        
        // Usar dados MQTT reais com campos definidos
        const labels = mqttData.map(d => {
          const date = new Date(d.timestamp);
          if (isNaN(date.getTime())) {
            return 'N/A';
          }
          return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }).reverse();
        
        const datasets = [];
        
        // Dataset principal (mqttField) - somente se preenchido
        if (config.mqttField && config.mqttField.trim() !== '') {
          console.log('📈 Criando dataset 1:', config.mqttField);
          const values = mqttData.map(d => {
            const payload = typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload;
            return payload[config.mqttField] || 0;
          }).reverse();

          datasets.push({
            label: config.mqttField,
            data: values,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            pointBorderColor: 'rgba(255, 99, 132, 1)',
            pointBorderWidth: 0,
            pointHoverBorderWidth: 0
          });
        }

        // Dataset secundário (mqttField2) - SOMENTE se preenchido
        if (config.mqttField2 && config.mqttField2.trim() !== '') {
          console.log('📈 Criando dataset 2:', config.mqttField2);
          const values2 = mqttData.map(d => {
            const payload = typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload;
            return payload[config.mqttField2] || 0;
          }).reverse();

          datasets.push({
            label: config.mqttField2,
            data: values2,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointBorderColor: 'rgba(54, 162, 235, 1)',
            pointBorderWidth: 0,
            pointHoverBorderWidth: 0
          });
        }

        console.log('📊 Total de datasets criados:', datasets.length);
        chartData = { labels, datasets };
      } else if (mqttData && mqttData.length > 0) {
        // Tentar detectar campos automaticamente SOMENTE se não houver mqttField configurado
        const lastPayload = typeof mqttData[0].payload === 'string' 
          ? JSON.parse(mqttData[0].payload) 
          : mqttData[0].payload;
        
        const fields = Object.keys(lastPayload).filter(k => typeof lastPayload[k] === 'number');
        
        if (fields.length > 0) {
          const labels = mqttData.map(d => {
            const date = new Date(d.timestamp);
            if (isNaN(date.getTime())) {
              return 'N/A';
            }
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          }).reverse();

          // Usar apenas o primeiro campo quando auto-detectar
          const datasets = [fields[0]].map((field, idx) => ({
            label: field,
            data: mqttData.map(d => {
              const payload = typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload;
              return payload[field] || 0;
            }).reverse(),
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            pointBorderColor: 'rgba(255, 99, 132, 1)',
            pointBorderWidth: 0,
            pointHoverBorderWidth: 0
          }));

          chartData = { labels, datasets };
        }
      }

      chartInstance.current = new Chart(chartRef.current, {
        type: config.type || 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          interaction: {
            mode: 'nearest',
            intersect: false,
            axis: 'x'
          },
          plugins: {
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: { size: 14 },
              bodyFont: { size: 13 },
              displayColors: true,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              borderWidth: 1
            },
            legend: {
              labels: {
                padding: 15,
                font: { size: 12 }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                padding: 8
              }
            },
            y: {
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                padding: 8
              }
            }
          },
          ...(config.options || {})
        }
      });
    } catch (err) {
      console.error('Erro ao criar gráfico:', err);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [widget, mqttData]);

  const config = typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config;

  // Se for tabela, renderizar TableWidget (tamanho maior)
  if (config && config.type === 'table') {
    return (
      <div 
        className={`admin-chart-card admin-table-card ${dragging ? 'dragging' : ''}`}
        style={{ left: position.x, top: position.y }}
        onMouseDown={onMouseDown}
      >
        <div className="chart-card-header">
          <h3 className="admin-chart-title">
            {widget.name || config.title || 'Tabela'}
          </h3>
          <div className="chart-actions">
            <button 
              className="chart-action-btn edit" 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              title="Editar tabela"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="currentColor"/>
              </svg>
            </button>
            <button 
              className="chart-action-btn delete" 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Excluir tabela"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="admin-chart-container">
          <TableWidget deviceId={deviceId} config={config} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`admin-chart-card ${dragging ? 'dragging' : ''}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={onMouseDown}
    >
      <div className="chart-card-header">
        <h3 className="admin-chart-title">
          {widget.name || widget.title || 'Gráfico'}
        </h3>
        <div className="chart-actions">
          <button 
            className="chart-action-btn download" 
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            title="Download Excel"
          >
            <img src={excelIcon} alt="Excel" className="chart-action-icon" />
          </button>
          <button 
            className="chart-action-btn edit" 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Editar gráfico"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="currentColor"/>
            </svg>
          </button>
          <button 
            className="chart-action-btn delete" 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Excluir gráfico"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="admin-chart-container">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

const AdminDashboardPage = ({ 
  username, 
  deviceName = 'Nome do dispositivo',
  device,
  widgets = [],
  setWidgets,
  onDownloadExcel,
  onBackToDevices,
  onAddDevice,
  onLogout,
  onRefreshWidgets,
  notifications = [],
  onAcceptUser,
  onRejectUser
}) => {
  const [showGraphEditor, setShowGraphEditor] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const [draggingWidget, setDraggingWidget] = useState(null);
  const [widgetPositions, setWidgetPositions] = useState({});
  const [mqttConnecting, setMqttConnecting] = useState(false);
  const [whiteboardHeight, setWhiteboardHeight] = useState(600);
  const whiteboardRef = useRef(null);

  // Carregar posições dos widgets do backend (campo position)
  useEffect(() => {
    if (widgets && widgets.length > 0) {
      const positions = {};
      widgets.forEach((widget, index) => {
        // Usar posição salva no backend ou posição padrão
        if (widget.position && (widget.position.x !== undefined || widget.position.y !== undefined)) {
          positions[widget.id] = widget.position;
        } else {
          positions[widget.id] = { x: 50 + (index * 370), y: 30 };
        }
      });
      setWidgetPositions(positions);
    }
  }, [widgets]);

  // Conectar dispositivo ao MQTT
  const handleConnectMqtt = async () => {
    if (!device || !device.id) return;
    
    setMqttConnecting(true);
    try {
      await mqttApi.connect(device.id);
      alert(`✅ Conectado ao broker MQTT!\n\nTópico: ${device.mqttTopic || 'N/A'}\n\nAgora você pode enviar dados para o tópico usando:\n- HiveMQ Web Client (https://www.hivemq.com/demos/websocket-client/)\n- Seu ESP32\n\nExemplo de payload: {"temperature": 25.5, "humidity": 60}`);
    } catch (error) {
      console.error('Erro ao conectar MQTT:', error);
      alert('Erro ao conectar ao MQTT: ' + error.message);
    } finally {
      setMqttConnecting(false);
    }
  };

  // Drag handlers para mover widgets livremente
  const handleMouseDown = (e, widgetId) => {
    if (e.target.closest('.chart-action-btn')) return; // Não arrastar se clicar nos botões
    
    const widget = e.currentTarget;
    const rect = widget.getBoundingClientRect();
    const whiteboardRect = whiteboardRef.current.getBoundingClientRect();
    
    // Identificar se é tabela para calcular limites corretos
    const widgetData = widgets.find(w => w.id === widgetId);
    const config = widgetData?.config ? 
      (typeof widgetData.config === 'string' ? JSON.parse(widgetData.config) : widgetData.config) 
      : {};
    const isTable = config?.type === 'table';
    
    setDraggingWidget({
      id: widgetId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      whiteboardLeft: whiteboardRect.left,
      whiteboardTop: whiteboardRect.top,
      isTable: isTable,
      widgetWidth: isTable ? 720 : 350,
      widgetHeight: isTable ? 450 : 280
    });
    
    widget.style.zIndex = 1000;
  };

  const handleMouseMove = (e) => {
    if (!draggingWidget || !whiteboardRef.current) return;
    
    const whiteboardRect = whiteboardRef.current.getBoundingClientRect();
    const newX = e.clientX - whiteboardRect.left - draggingWidget.offsetX;
    const newY = e.clientY - whiteboardRect.top - draggingWidget.offsetY;
    
    // Limitar dentro do whiteboard usando tamanho real do widget
    const maxX = whiteboardRect.width - draggingWidget.widgetWidth;
    const maxY = whiteboardRect.height - draggingWidget.widgetHeight;
    
    setWidgetPositions(prev => ({
      ...prev,
      [draggingWidget.id]: {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      }
    }));
  };

  const handleMouseUp = async () => {
    if (draggingWidget && device?.id) {
      // Salvar posição no backend quando soltar o widget
      const newPosition = widgetPositions[draggingWidget.id];
      if (newPosition) {
        try {
          await widgetsApi.update(draggingWidget.id, { position: newPosition });
          console.log(`✅ Posição do widget ${draggingWidget.id} salva no backend:`, newPosition);
        } catch (error) {
          console.error('Erro ao salvar posição do widget:', error);
        }
      }
    }
    setDraggingWidget(null);
  };

  useEffect(() => {
    if (draggingWidget) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingWidget, widgetPositions]);

  // Calcular altura do whiteboard baseado nas posições dos widgets
  useEffect(() => {
    if (!widgets || widgets.length === 0) {
      setWhiteboardHeight(600);
      return;
    }

    let maxBottom = 600; // Altura mínima
    
    widgets.forEach(widget => {
      const position = widgetPositions[widget.id] || { x: 0, y: 0 };
      const config = typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config;
      
      // Altura baseada no tipo (tabela é maior)
      const widgetHeight = config?.type === 'table' ? 450 : 280;
      const bottom = position.y + widgetHeight + 50; // +50 de margem
      
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    });
    
    setWhiteboardHeight(maxBottom);
  }, [widgets, widgetPositions]);

  const handleDownload = (chartType) => {
    if (onDownloadExcel) {
      onDownloadExcel(chartType);
    }
  };

  const handleCreateGraph = () => {
    setEditingWidget(null);
    setShowGraphEditor(true);
  };

  const handleEditWidget = (widget) => {
    setEditingWidget(widget);
    setShowGraphEditor(true);
  };

  const handleDeleteWidget = async (widgetId) => {
    try {
      await widgetsApi.delete(widgetId);
      // Recarrega widgets após deletar
      if (onRefreshWidgets) {
        onRefreshWidgets();
      } else if (setWidgets) {
        setWidgets(widgets.filter(w => w.id !== widgetId));
      }
    } catch (error) {
      console.error('Erro ao deletar widget:', error);
      alert('Erro ao deletar widget: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleSaveWidget = async (widgetConfig) => {
    try {
      // Formata o widget para o formato esperado pelo backend
      const widgetData = {
        name: widgetConfig.title || 'Widget',
        type: widgetConfig.type,
        deviceId: device?.id,
        config: {
          type: widgetConfig.type,
          data: widgetConfig.data,
          options: widgetConfig.options,
          mqttField: widgetConfig.mqttField || null,
          mqttField2: widgetConfig.mqttField2 || null,
          useMqttData: widgetConfig.useMqttData || false,
          thresholds: widgetConfig.thresholds || null,
          limit: widgetConfig.limit || null
        }
      };

      console.log('Salvando widget:', widgetData);
      console.log('Thresholds sendo salvos:', widgetConfig.thresholds);

      if (editingWidget && editingWidget.id) {
        // Editando widget existente
        await widgetsApi.update(editingWidget.id, widgetData);
      } else {
        // Criando novo widget
        await widgetsApi.create(widgetData);
      }
      // Recarrega widgets após salvar
      if (onRefreshWidgets) {
        onRefreshWidgets();
      }
    } catch (error) {
      console.error('Erro ao salvar widget:', error);
      alert('Erro ao salvar widget: ' + (error.message || 'Erro desconhecido'));
    }
    setShowGraphEditor(false);
    setEditingWidget(null);
  };

  return (
    <div className="admin-dashboard-container">
      <AdminHeader 
        username={username}
        onLogout={onLogout}
        onAddDevice={onAddDevice}
        onBackToDevices={onBackToDevices}
        onCreateGraph={handleCreateGraph}
        isOnDevicesPage={false}
        isOnDashboard={true}
        notifications={notifications}
        onAcceptUser={onAcceptUser}
        onRejectUser={onRejectUser}
      />
      
      <main className="admin-dashboard-content">
        {/* Device Title */}
        <div className="admin-device-title-section">
          <h1 className="admin-device-title">#{deviceName}</h1>
        </div>

        {/* Charts Whiteboard - Miro Style */}
        <div 
          className="admin-charts-whiteboard" 
          ref={whiteboardRef}
          style={{ height: `${whiteboardHeight}px` }}
        >
          {widgets.length === 0 ? (
            <div className="empty-whiteboard">
              <div className="empty-whiteboard-content">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" className="empty-icon">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <h3>Nenhum gráfico ainda</h3>
                <p>Clique no botão abaixo para criar seu primeiro gráfico</p>
                <button className="create-first-graph-btn" onClick={handleCreateGraph}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Criar Gráfico
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Renderiza widgets salvos no backend */}
              {widgets.map((widget, index) => (
                <DynamicWidgetCard
                  key={widget.id}
                  widget={widget}
                  deviceId={device?.id}
                  position={widgetPositions[widget.id] || { x: 50 + (index * 370), y: 30 }}
                  dragging={draggingWidget?.id === widget.id}
                  onMouseDown={(e) => handleMouseDown(e, widget.id)}
                  onEdit={() => handleEditWidget(widget)}
                  onDelete={() => handleDeleteWidget(widget.id)}
                  onDownload={() => handleDownload(widget.type)}
                />
              ))}
            </>
          )}
        </div>

      </main>

      <Footer />

      {/* Graph Editor Modal */}
      <GraphEditorModal
        isOpen={showGraphEditor}
        existingWidget={editingWidget ? (() => {
          const config = typeof editingWidget.config === 'string' 
            ? JSON.parse(editingWidget.config) 
            : editingWidget.config;
          return {
            ...config,
            title: editingWidget.name,
            id: editingWidget.id
          };
        })() : null}
        onSave={handleSaveWidget}
        onClose={() => {
          setShowGraphEditor(false);
          setEditingWidget(null);
        }}
      />
    </div>
  );
};

export default AdminDashboardPage;
