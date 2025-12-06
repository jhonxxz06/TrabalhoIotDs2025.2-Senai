import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './TableWidget.css';

const TableWidget = ({ deviceId, config }) => {
  const [exceedances, setExceedances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExceedances();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchExceedances, 30000);
    return () => clearInterval(interval);
  }, [deviceId, config]);

  const fetchExceedances = async () => {
    try {
      setLoading(true);
      
      // Construir query params com thresholds do config
      const params = new URLSearchParams();
      params.append('limit', config.limit || 50);
      
      if (config.thresholds) {
        Object.entries(config.thresholds).forEach(([field, limits]) => {
          if (limits.min !== undefined && limits.min !== '') {
            params.append(`${field}Min`, limits.min);
          }
          if (limits.max !== undefined && limits.max !== '') {
            params.append(`${field}Max`, limits.max);
          }
        });
      }

      const response = await api.mqtt.getExceedances(deviceId, params.toString());
      
      if (response.data.success) {
        setExceedances(response.data.data);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar excedências:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
        <button onClick={fetchExceedances} className="refresh-btn" disabled={loading}>
          {loading ? '↻' : '⟳'}
        </button>
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
            {exceedances.map((exc, index) => (
              <tr key={index}>
                <td className="timestamp-cell">{formatDateTime(exc.timestamp)}</td>
                <td className="field-cell">{exc.alert.field}</td>
                <td className="value-cell">
                  <strong>{exc.alert.value}</strong>
                </td>
                <td className="threshold-cell">{exc.alert.threshold}</td>
                <td className="type-cell">
                  <span className={`badge ${getBadgeClass(exc.alert.type)}`}>
                    {getBadgeText(exc.alert.type)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="table-widget-footer">
        <small>
          {exceedances.length} alerta{exceedances.length !== 1 ? 's' : ''} detectado{exceedances.length !== 1 ? 's' : ''}
        </small>
      </div>
    </div>
  );
};

export default TableWidget;
