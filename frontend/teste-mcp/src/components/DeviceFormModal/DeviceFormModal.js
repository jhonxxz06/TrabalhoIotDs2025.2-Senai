import React, { useState, useEffect } from 'react';
import './DeviceFormModal.css';

const DeviceFormModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  device = null,
  mode = 'create', // 'create' ou 'edit'
  allUsers = []
}) => {
  const [formData, setFormData] = useState({
    name: '',
    mqttBroker: '',
    mqttPort: '1883',
    mqttTopic: '',
    mqttUsername: '',
    mqttPassword: '',
    assignedUsers: []
  });

  useEffect(() => {
    if (device && mode === 'edit') {
      // Extrai IDs se assignedUsers for array de objetos
      const userIds = (device.assignedUsers || []).map(u => 
        typeof u === 'object' ? u.id : u
      );
      
      setFormData({
        name: device.name || '',
        mqttBroker: device.mqttBroker || '',
        mqttPort: device.mqttPort || '1883',
        mqttTopic: device.mqttTopic || '',
        mqttUsername: device.mqttUsername || '',
        mqttPassword: device.mqttPassword || '',
        assignedUsers: userIds
      });
    } else {
      setFormData({
        name: '',
        mqttBroker: '',
        mqttPort: '1883',
        mqttTopic: '',
        mqttUsername: '',
        mqttPassword: '',
        assignedUsers: []
      });
    }
  }, [device, mode, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUserToggle = (userId) => {
    setFormData(prev => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter(id => id !== userId)
        : [...prev.assignedUsers, userId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        ...device,
        ...formData,
        id: device?.id || Date.now()
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="device-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Novo Dispositivo' : 'Editar Dispositivo'}</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Informações Básicas</h3>
            
            <div className="form-group">
              <label htmlFor="name">Nome do Dispositivo</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: ESP32 Sala"
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Configuração MQTT (HiveMQ)</h3>
            
            <div className="form-row">
              <div className="form-group flex-2">
                <label htmlFor="mqttBroker">Broker URL</label>
                <input
                  type="text"
                  id="mqttBroker"
                  name="mqttBroker"
                  value={formData.mqttBroker}
                  onChange={handleChange}
                  placeholder="Ex: broker.hivemq.com"
                  required
                />
              </div>
              <div className="form-group flex-1">
                <label htmlFor="mqttPort">Porta</label>
                <input
                  type="text"
                  id="mqttPort"
                  name="mqttPort"
                  value={formData.mqttPort}
                  onChange={handleChange}
                  placeholder="1883"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="mqttTopic">Tópico MQTT</label>
              <input
                type="text"
                id="mqttTopic"
                name="mqttTopic"
                value={formData.mqttTopic}
                onChange={handleChange}
                placeholder="Ex: esp32/sensor/data"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mqttUsername">Usuário (opcional)</label>
                <input
                  type="text"
                  id="mqttUsername"
                  name="mqttUsername"
                  value={formData.mqttUsername}
                  onChange={handleChange}
                  placeholder="Usuário do broker"
                />
              </div>
              <div className="form-group">
                <label htmlFor="mqttPassword">Senha (opcional)</label>
                <input
                  type="password"
                  id="mqttPassword"
                  name="mqttPassword"
                  value={formData.mqttPassword}
                  onChange={handleChange}
                  placeholder="Senha do broker"
                />
              </div>
            </div>
          </div>

          {allUsers.length > 0 && (
            <div className="form-section">
              <h3>Usuários com Acesso</h3>
              <div className="users-list">
                {allUsers.map(user => (
                  <label key={user.id} className="user-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.assignedUsers.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                    />
                    <span className="user-info">
                      <span className="user-name">{user.username}</span>
                      <span className="user-email">{user.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {mode === 'create' ? 'Criar Dispositivo' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceFormModal;
