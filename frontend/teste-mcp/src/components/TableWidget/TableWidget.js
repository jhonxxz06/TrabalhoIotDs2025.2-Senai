import React, { useState, useEffect } from 'react';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import './TableWidget.css';

const TableWidget = ({ deviceId, config }) => {
  const [exceedances, setExceedances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExceedances();

    // Inicializar socket e inscrever no room do dispositivo
    try {
      const socket = getSocket();

      const socketHandler = (data) => {
        try {
          if (data && data.deviceId && data.deviceId.toString() === deviceId.toString()) {
            console.log('📡 Evento mqtt:data recebido (TableWidget), recarregando excedências', data);
            fetchExceedances();
          }
        } catch (e) {
          console.warn('Erro no handler do socket:', e);
        }
      };

      socket.emit('subscribe:device', deviceId);
      socket.on('mqtt:data', socketHandler);

      // Polling como fallback (a cada 30 segundos)
      const interval = setInterval(fetchExceedances, 30000);

      return () => {
        clearInterval(interval);
        socket.off('mqtt:data', socketHandler);
        try { socket.emit('unsubscribe:device', deviceId); } catch (e) {}
      };
    } catch (e) {
      console.warn('Socket não disponível, mantendo polling como fallback');
      const interval = setInterval(fetchExceedances, 30000);
      return () => clearInterval(interval);
    }
  }, [deviceId, config]);

  const fetchExceedances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 TableWidget - Config recebido:', config);
      console.log('🔍 TableWidget - Device ID:', deviceId);
      
      // Validar e parsear config
      if (!config) {
        console.log('⚠️ Config é undefined');
        setExceedances([]);
        setLoading(false);
        return;
      }
      
      // Se config é string, parsear como JSON
      let parsedConfig = config;
      if (typeof config === 'string') {
        try {
          parsedConfig = JSON.parse(config);
        } catch (e) {
          console.error('❌ Erro ao parsear config JSON:', e);
          setError('Erro ao processar configuração do widget');
          setExceedances([]);
          setLoading(false);
          return;
        }
      }
      
      // Validar que temos thresholds (thresholds pode ser undefined, null, ou {})
      const thresholds = parsedConfig?.thresholds;
      if (!thresholds || Object.keys(thresholds).length === 0) {
        console.log('⚠️ Nenhum threshold configurado no widget');
        setExceedances([]);
        setLoading(false);
        return;
      }
      
      // Construir query params com thresholds do config
      const params = new URLSearchParams();
      params.append('limit', parsedConfig.limit || 50);
      
      console.log('📊 Thresholds configurados:', thresholds);
      
      // Apenas adicionar aos params se tiver valores
      let hasThresholds = false;
      Object.entries(thresholds).forEach(([field, limits]) => {
        if (limits && typeof limits === 'object') {
          if (limits.min !== undefined && limits.min !== null && limits.min !== '') {
            params.append(`${field}Min`, limits.min);
            console.log(`✅ Adicionado ${field}Min = ${limits.min}`);
            hasThresholds = true;
          }
          if (limits.max !== undefined && limits.max !== null && limits.max !== '') {
            params.append(`${field}Max`, limits.max);
            console.log(`✅ Adicionado ${field}Max = ${limits.max}`);
            hasThresholds = true;
          }
        }
      });

      if (!hasThresholds) {
        console.log('⚠️ Nenhum threshold com valores válidos');
        setExceedances([]);
        setLoading(false);
        return;
      }

      console.log('🌐 URL da requisição:', `/api/mqtt/${deviceId}/exceedances?${params.toString()}`);
      const response = await api.mqtt.getExceedances(deviceId, params.toString());
      
      console.log('📥 Resposta da API:', response);
      
      if (response.success && Array.isArray(response.data)) {
        console.log('✅ Excedências encontradas:', response.data.length);
        
        // Transformar dados da API para o formato esperado pelo TableWidget
        // A API retorna registros simples, mas precisamos de estrutura com alerts
        const transformedData = response.data.map((item, index) => {
          let payload = item.payload;
          
          // Parsear payload se necessário
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload);
            } catch (e) {
              console.warn(`⚠️ Erro ao parsear payload do item ${index}:`, e);
              payload = {};
            }
          }
          
          const alerts = [];
          
          // Verificar cada threshold e criar alerts
          Object.entries(thresholds).forEach(([field, limits]) => {
            const value = payload[field];
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                const numValue = parseFloat(value);
                
                if (isNaN(numValue)) {
                  console.warn(`⚠️ Valor não é número para ${field}: ${value}`);
                  return;
                }
                
                // Verificar se está abaixo do mínimo
                if (limits.min !== undefined && limits.min !== null && limits.min !== '') {
                  const minVal = parseFloat(limits.min);
                  if (!isNaN(minVal) && numValue < minVal) {
                    alerts.push({
                      field,
                      value: numValue,
                      threshold: limits.min,
                      type: 'below'
                    });
                  }
                }
                
                // Verificar se está acima do máximo
                if (limits.max !== undefined && limits.max !== null && limits.max !== '') {
                  const maxVal = parseFloat(limits.max);
                  if (!isNaN(maxVal) && numValue > maxVal) {
                    alerts.push({
                      field,
                      value: numValue,
                      threshold: limits.max,
                      type: 'above'
                    });
                  }
                }
              } catch (e) {
                console.warn(`⚠️ Erro ao processar threshold para ${field}:`, e);
              }
            }
          });
          
          return {
            id: item.id || `exc-${index}`,
            deviceId: item.device_id,
            timestamp: item.timestamp || item.receivedAt || item.received_at || null,
            payload,
            alerts,
            Data: item.Data || item.data || null,
            Hora: item.Hora || item.hora || null
          };
        });
        
        setExceedances(transformedData);
      } else {
        setExceedances([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Erro completo ao buscar excedências:', err);
      console.error('Stack:', err.stack);
      const errorMsg = err.message || 'Erro desconhecido ao buscar dados';
      setError(errorMsg);
      setExceedances([]);
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const ts = (typeof timestamp === 'string') ? timestamp.trim().replace(' ', 'T') : timestamp;
      const date = ts instanceof Date ? ts : new Date(ts);
      if (isNaN(date.getTime())) return '';

      // Match other widgets: format according to browser locale (pt-BR) without forcing a timezone
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      console.warn('formatDateTime error:', e);
      return '';
    }
  };

  const getBadgeClass = (type) => {
    return type === 'above' ? 'badge-danger' : 'badge-warning';
  };

  const getBadgeText = (type) => {
    return type === 'above' ? 'ACIMA' : 'ABAIXO';
  };

  if (loading && exceedances.length === 0) {
    return <div className="table-widget-loading">Carregando alertas...</div>;
  }

  if (error) {
    return <div className="table-widget-error">Erro: {error}</div>;
  }

  if (exceedances.length === 0) {
    return (
      <div className="table-widget-empty">
        <p>✓ Nenhuma excedência detectada</p>
        <small>Todos os valores estão dentro dos limites configurados</small>
      </div>
    );
  }

  return (
    <div className="table-widget">
      <div className="table-widget-header">
        <h3>Alertas de Excedências</h3>
      </div>
      
      <div className="table-widget-content">
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Campo</th>
              <th>Valor</th>
              <th>Limite</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {exceedances.flatMap((exc) => {
              // Validar que alerts existe e é array
              if (!exc.alerts || !Array.isArray(exc.alerts) || exc.alerts.length === 0) {
                return [];
              }
              
              return exc.alerts.map((alert, alertIndex) => (
                <tr key={`${exc.id}-${alertIndex}`}>
                  <td className="timestamp-cell">{
                    (exc.Data && exc.Hora)
                      ? (() => {
                          // Parse dd/mm/yyyy HH:MM:SS
                          const [d, m, y] = exc.Data.split('/').map(Number);
                          const [hh, mm, ss] = exc.Hora.split(':').map(Number);
                          const date = new Date(y, m - 1, d, hh, mm, ss);
                          date.setHours(date.getHours() + 3);
                          return date.toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          });
                        })()
                      : ''
                  }</td>
                  <td className="field-cell">{alert.field || 'N/A'}</td>
                  <td className="value-cell">
                    <strong>{alert.value !== undefined ? alert.value : 'N/A'}</strong>
                  </td>
                  <td className="threshold-cell">{alert.threshold || 'N/A'}</td>
                  <td className="type-cell">
                    <span className={`badge ${getBadgeClass(alert.type)}`}>
                      {getBadgeText(alert.type)}
                    </span>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
      
      <div className="table-widget-footer">
        <small>
          {(() => {
            const totalAlerts = exceedances.reduce((sum, exc) => sum + (exc.alerts?.length || 0), 0);
            return `${totalAlerts} alerta${totalAlerts !== 1 ? 's' : ''} detectado${totalAlerts !== 1 ? 's' : ''}`;
          })()}
        </small>
      </div>
    </div>
  );
};

export default TableWidget;