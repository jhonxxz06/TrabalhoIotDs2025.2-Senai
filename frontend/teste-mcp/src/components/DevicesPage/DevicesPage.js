import React from 'react';
import './DevicesPage.css';
import Header from '../Header';
import Footer from '../Footer';
import waitingImage from '../../assets/waiting-image.png';

const DevicesPage = ({ 
  username, 
  devices = [], 
  onDeviceClick, 
  onLogout, 
  onLogoClick,
  availableDevices = [],
  onRequestAccess
}) => {
  const hasDevices = devices.length > 0;

  return (
    <div className="devices-container">
      <Header 
        username={username} 
        onLogout={onLogout}
        onLogoClick={onLogoClick}
        isOnDevicesPage={true}
        availableDevices={availableDevices}
        onRequestAccess={onRequestAccess}
      />
      
      <main className="devices-content">
        {hasDevices ? (
          <div className="devices-grid">
            {devices.map((device) => (
              <div 
                key={device.id} 
                className="device-card"
                onClick={() => onDeviceClick && onDeviceClick(device)}
              >
                <div className="device-icon">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="device-name">{device.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-devices-state">
            <div className="empty-image-container">
              <img src={waitingImage} alt="Sem dispositivos" className="empty-image" />
            </div>
            <h2>Nenhum dispositivo disponível</h2>
            <p>Você ainda não tem acesso a nenhum dispositivo.<br/>Aguarde a liberação pelo administrador.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DevicesPage;
