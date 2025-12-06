import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { io } from 'socket.io-client';
import './DashboardPage.css';
import Header from '../Header';
import Footer from '../Footer';
import TableWidget from '../TableWidget';
import excelIcon from '../../assets/excel-icon.png';
import { mqtt as mqttApi } from '../../services/api';

// Registrar todos os componentes do Chart.js
Chart.register(...registerables);

// Inicializar Socket.IO (fora do componente)
const socket = io('http://localhost:3001', {
  autoConnect: false
});

// Componente para renderizar widgets dinâmicos com dados MQTT
const DynamicWidget = ({ widget, deviceId, onDownload }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [mqttData, setMqttData] = useState([]);

  // Buscar dados MQTT iniciais
  const fetchInitialData = useCallback(async () => {
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

  // WebSocket - Conectar e escutar dados em tempo real
  useEffect(() => {
    if (!deviceId) return;
    
    // Buscar dados iniciais
    fetchInitialData();
    
    // Conectar ao WebSocket
    if (!socket.connected) {
      socket.connect();
    }
    
    // Inscrever-se no dispositivo
    socket.emit('subscribe:device', deviceId);
    console.log(`🔌 Conectado ao WebSocket - Device ${deviceId}`);
    
    // Listener para dados MQTT em tempo real
    const handleMqttData = (data) => {
      console.log('📥 Dados MQTT em tempo real:', data);
      
      if (data.deviceId === deviceId) {
        // Adicionar novo dado ao início do array
        setMqttData((prevData) => {
          const newData = [{
            id: Date.now(),
            device_id: data.deviceId,
            topic: data.topic,
            payload: data.payload,
            timestamp: data.timestamp,
            received_at: data.timestamp
          }, ...prevData];
          
          // Manter apenas os últimos 20 registros
          return newData.slice(0, 20);
        });
      }
    };
    
    socket.on('mqtt:data', handleMqttData);
    
    // Cleanup
    return () => {
      socket.emit('unsubscribe:device', deviceId);
      socket.off('mqtt:data', handleMqttData);
      console.log(`🔌 Desconectado do WebSocket - Device ${deviceId}`);
    };
  }, [deviceId, fetchInitialData]);

  // Criar/atualizar gráfico
  useEffect(() => {
    if (!chartRef.current || !widget.config) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    try {
      const config = typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config;
      
      let chartData = config.data || { labels: [], datasets: [] };
      
      // Se temos dados MQTT, usá-los no gráfico
      if (mqttData && mqttData.length > 0 && config.mqttField) {
        // Usar campos definidos explicitamente
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

        chartData = { labels, datasets };
      } else if (mqttData && mqttData.length > 0) {
        // Detectar campos automaticamente SOMENTE se não houver mqttField configurado
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

  // Se for tabela, renderizar apenas TableWidget (sem wrapper)
  if (config && config.type === 'table') {
    return <TableWidget deviceId={deviceId} config={config} />;
  }

  return (
    <>
      <div className="chart-header">
        <h3 className="chart-title">
          {widget.name || widget.title || 'Gráfico'}
        </h3>
        <button 
          className="chart-download-btn"
          onClick={() => onDownload && onDownload(widget.type)}
          title="Download Excel"
        >
          <img src={excelIcon} alt="Excel" className="excel-icon-small" />
        </button>
      </div>
      <div className="chart-wrapper">
        <canvas ref={chartRef}></canvas>
      </div>
    </>
  );
};

const DashboardPage = ({ 
  username, 
  deviceName = 'Nome do dispositivo',
  device,
  widgets = [],
  onDownloadExcel,
  onBackToDevices,
  onLogout
}) => {
  const [widgetPositions, setWidgetPositions] = useState({});
  const [whiteboardHeight, setWhiteboardHeight] = useState(600);

  // Carregar posições salvas pelo admin
  useEffect(() => {
    if (device?.id) {
      const key = `widgetPositions_${device.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setWidgetPositions(JSON.parse(saved));
      }
    }
  }, [device?.id]);

  // Calcular altura do whiteboard baseado nas posições dos widgets
  useEffect(() => {
    if (!widgets || widgets.length === 0) {
      setWhiteboardHeight(600);
      return;
    }

    let maxBottom = 600;
    
    widgets.forEach((widget, index) => {
      const position = widgetPositions[widget.id] || { x: 50 + (index * 370), y: 30 };
      const config = typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config;
      
      const widgetHeight = config?.type === 'table' ? 450 : 280;
      const bottom = position.y + widgetHeight + 50;
      
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    });
    
    setWhiteboardHeight(maxBottom);
  }, [widgets, widgetPositions]);

  const handleDownload = (chartType) => {
    if (onDownloadExcel) {
      onDownloadExcel(chartType);
    } else {
      console.log(`Download Excel - ${chartType}`);
    }
  };

  return (
    <div className="dashboard-container">
      <Header 
        username={username} 
        onBackToDevices={onBackToDevices}
        onLogout={onLogout}
        onLogoClick={onBackToDevices}
        isOnDevicesPage={false}
      />
      
      <main className="dashboard-content">
        {/* Welcome Message */}
        <div className="welcome-banner">
          <h1 className="welcome-message">
            Bem Vindo {username || '{nome}'} ao dashboard
          </h1>
        </div>

        {/* Device Title */}
        <h2 className="device-title">#{deviceName}</h2>

        {/* Charts Whiteboard */}
        <div className="charts-whiteboard" style={{ height: `${whiteboardHeight}px`, minHeight: '600px', position: 'relative' }}>
          {widgets.length === 0 ? (
            <div className="empty-charts">
              <div className="empty-charts-content">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="empty-icon">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 14L10 11L13 14L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3>Nenhum gráfico configurado</h3>
                <p>O administrador ainda não criou gráficos para este dispositivo</p>
              </div>
            </div>
          ) : (
            widgets.map((widget, index) => {
              const config = typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config;
              const position = widgetPositions[widget.id] || { x: 50 + (index * 370), y: 30 };
              const isTable = config?.type === 'table';
              
              return (
                <div
                  key={widget.id}
                  className={isTable ? 'chart-card table-card-positioned' : 'chart-card'}
                  style={{
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: isTable ? '720px' : '350px',
                    height: isTable ? '450px' : '280px'
                  }}
                >
                  {isTable ? (
                    <TableWidget deviceId={device?.id} config={config} />
                  ) : (
                    <DynamicWidget
                      widget={widget}
                      deviceId={device?.id}
                      onDownload={handleDownload}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DashboardPage;
