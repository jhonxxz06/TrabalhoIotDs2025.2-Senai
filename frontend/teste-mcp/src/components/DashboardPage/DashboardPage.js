import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import './DashboardPage.css';
import Header from '../Header';
import Footer from '../Footer';
import excelIcon from '../../assets/excel-icon.png';
import { mqtt as mqttApi } from '../../services/api';

// Registrar todos os componentes do Chart.js
Chart.register(...registerables);

// Componente para renderizar widgets dinâmicos com dados MQTT
const DynamicWidget = ({ widget, deviceId, onDownload }) => {
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
      
      let chartData = config.data || { labels: [], datasets: [] };
      
      // Se temos dados MQTT, usá-los no gráfico
      if (mqttData && mqttData.length > 0 && config.mqttField) {
        // Usar campos definidos explicitamente
        const labels = mqttData.map(d => {
          const date = new Date(d.timestamp);
          return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }).reverse();
        
        const datasets = [];
        
        // Dataset principal (mqttField)
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
          tension: 0.4
        });

        // Dataset secundário (mqttField2) se existir
        if (config.mqttField2) {
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
            tension: 0.4
          });
        }

        chartData = { labels, datasets };
      } else if (mqttData && mqttData.length > 0) {
        // Detectar campos automaticamente
        const lastPayload = typeof mqttData[0].payload === 'string' 
          ? JSON.parse(mqttData[0].payload) 
          : mqttData[0].payload;
        
        const fields = Object.keys(lastPayload).filter(k => typeof lastPayload[k] === 'number');
        
        if (fields.length > 0) {
          const labels = mqttData.map(d => {
            const date = new Date(d.timestamp);
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          }).reverse();

          const datasets = fields.slice(0, 2).map((field, idx) => ({
            label: field,
            data: mqttData.map(d => {
              const payload = typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload;
              return payload[field] || 0;
            }).reverse(),
            borderColor: idx === 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)',
            backgroundColor: idx === 0 ? 'rgba(255, 99, 132, 0.2)' : 'rgba(54, 162, 235, 0.2)',
            fill: true,
            tension: 0.4
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

  return (
    <div className="chart-card">
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
    </div>
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

        {/* Charts Grid */}
        <div className="charts-grid">
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
            widgets.map(widget => (
              <DynamicWidget
                key={widget.id}
                widget={widget}
                deviceId={device?.id}
                onDownload={handleDownload}
              />
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DashboardPage;
