import React, { useState, useEffect, useRef } from 'react';
import './Header.css';
import logo from '../../assets/logo.png';
import settingsIcon from '../../assets/settings-icon.png';

const Header = ({ 
  username, 
  onUserClick, 
  onSettingsClick, 
  onLogoClick, 
  onLogout, 
  onBackToDevices, 
  isOnDevicesPage,
  availableDevices = [],
  onRequestAccess
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const menuRef = useRef(null);
  const modalRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleUserClick = () => {
    setShowMenu(!showMenu);
  };

  const handleSettingsClick = () => {
    if (!isOnDevicesPage && onBackToDevices) {
      onBackToDevices();
    }
  };

  const handleDeviceToggle = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSubmitRequest = async () => {
    if (selectedDevices.length === 0) {
      alert('Selecione pelo menos um dispositivo');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onRequestAccess) {
        await onRequestAccess(selectedDevices, requestMessage);
      }
      setShowRequestModal(false);
      setSelectedDevices([]);
      setRequestMessage('');
      alert('Solicitação enviada com sucesso!');
    } catch (error) {
      alert('Erro ao enviar solicitação: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRequestModal = () => {
    setSelectedDevices([]);
    setRequestMessage('');
    setShowRequestModal(true);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          {onBackToDevices && (
            <button className="back-button" onClick={onBackToDevices}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="white"/>
              </svg>
              <span>Voltar</span>
            </button>
          )}
        </div>

        <div className="header-center">
          <img src={logo} alt="Logo" className="header-logo" />
        </div>

        <div className="header-right">
          {/* Botão de Solicitar Acesso - só na página de dispositivos */}
          {isOnDevicesPage && availableDevices.length > 0 && (
            <button 
              className="request-access-button"
              onClick={handleOpenRequestModal}
              title="Solicitar acesso a dispositivo"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="13" rx="2" stroke="white" strokeWidth="2"/>
                <path d="M8 21H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 17V21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 8V14M9 11H15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          <button 
            className={`settings-button ${isOnDevicesPage ? 'on-devices-page' : ''}`} 
            onClick={handleSettingsClick}
            title={isOnDevicesPage ? '' : 'Voltar para Dispositivos'}
          >
            <img src={settingsIcon} alt="Home" className="settings-icon" />
          </button>
          
          <span className="username">{username || '{username}'}</span>
          
          <div className="user-menu-container" ref={menuRef}>
            <button className="user-avatar" onClick={handleUserClick}>
              <svg width="49" height="49" viewBox="0 0 49 49" fill="none">
                <circle cx="24.5" cy="24.5" r="23" stroke="white" strokeWidth="2.5"/>
                <circle cx="24.5" cy="17" r="10" fill="white"/>
                <path d="M7 45C7 35 17 28 24.5 28C32 28 42 35 42 45" stroke="white" strokeWidth="2.5"/>
              </svg>
            </button>
            
            {showMenu && (
              <div className="user-dropdown">
                <button onClick={() => { setShowMenu(false); onUserClick && onUserClick(); }}>
                  Perfil
                </button>
                <button onClick={() => { 
                  setShowMenu(false); 
                  if (onLogout) {
                    onLogout();
                  }
                }}>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Solicitar Acesso */}
      {showRequestModal && (
        <div className="request-modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="request-modal" onClick={(e) => e.stopPropagation()} ref={modalRef}>
            <div className="request-modal-header">
              <h2>Solicitar Acesso a Dispositivo</h2>
              <button className="close-btn" onClick={() => setShowRequestModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            
            <div className="request-modal-body">
              <div className="form-group">
                <label>Selecione os dispositivos:</label>
                <div className="devices-checkbox-list">
                  {availableDevices.map(device => (
                    <label key={device.id} className="device-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={() => handleDeviceToggle(device.id)}
                      />
                      <span className="device-checkbox-name">{device.name}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            <div className="request-modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowRequestModal(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                className="btn-submit" 
                onClick={handleSubmitRequest}
                disabled={isSubmitting || selectedDevices.length === 0}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
