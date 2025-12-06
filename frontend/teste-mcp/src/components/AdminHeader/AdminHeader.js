import React, { useState, useEffect, useRef } from 'react';
import './AdminHeader.css';
import logo from '../../assets/logo.png';

const AdminHeader = ({ 
  username, 
  onLogout, 
  onAddDevice, 
  onCreateGraph,
  onBackToDevices,
  isOnDevicesPage = true,
  isOnDashboard = false,
  notifications = [],
  onAcceptUser,
  onRejectUser
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleHomeClick = () => {
    if (!isOnDevicesPage && onBackToDevices) {
      onBackToDevices();
    }
  };

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        {!isOnDevicesPage && (
          <button className="back-button" onClick={onBackToDevices}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="white"/>
            </svg>
            <span>Voltar</span>
          </button>
        )}
      </div>

      <div className="admin-header-center">
        <img src={logo} alt="Logo" className="admin-header-logo" />
      </div>

      <div className="admin-header-right">
        {/* Ícone de Criar Gráfico (só aparece no Dashboard) */}
        {isOnDashboard && (
          <button 
            className="admin-icon-button graph-button" 
            onClick={onCreateGraph} 
            title="Criar/Editar Gráfico (JSON)"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3.5 18.49L9.5 12.48L13.5 16.48L22 6.92L20.59 5.51L13.5 13.48L9.5 9.48L2 16.99L3.5 18.49Z" fill="white"/>
              <path d="M19 3H5C3.9 3 3 3.9 3 5V7H5V5H19V19H5V17H3V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="white"/>
            </svg>
          </button>
        )}

        {/* Ícone de Adicionar Dispositivo (TV com +) - SÓ na página de dispositivos */}
        {isOnDevicesPage && (
          <button 
            className="admin-icon-button" 
            onClick={onAddDevice} 
            title="Adicionar Dispositivo"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="13" rx="2" stroke="white" strokeWidth="2"/>
              <path d="M8 21H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 17V21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 8V14M9 11H15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {/* Ícone de Home (só funciona fora da página de devices) */}
        <button 
          className={`admin-icon-button home-button ${isOnDevicesPage ? 'on-devices-page' : ''}`}
          onClick={handleHomeClick}
          title={isOnDevicesPage ? '' : 'Voltar para Dispositivos'}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="white"/>
          </svg>
        </button>

        {/* Ícone de Sino com Notificações */}
        <div className="notification-container" ref={notificationRef}>
          <button 
            className="admin-icon-button notification-button" 
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notificações"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="white"/>
            </svg>
            {notifications.length > 0 && (
              <div className="notification-badge">
                <span>{notifications.length <= 3 ? notifications.length : `+${notifications.length}`}</span>
              </div>
            )}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h4>Solicitações de Acesso</h4>
              </div>
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <p>Nenhuma solicitação pendente</p>
                </div>
              ) : (
                <div className="notification-list">
                  {notifications.map((notif, index) => (
                    <div key={notif.id || index} className="notification-item">
                      <div className="notification-info">
                        <span className="notification-user">{notif.username}</span>
                        <span className="notification-device">quer acessar: <strong>{notif.deviceName || 'Sistema'}</strong></span>
                      </div>
                      <div className="notification-actions">
                        <button 
                          className="notif-btn accept"
                          onClick={() => { onAcceptUser && onAcceptUser(notif); setShowNotifications(false); }}
                          title="Aceitar"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button 
                          className="notif-btn reject"
                          onClick={() => { onRejectUser && onRejectUser(notif); setShowNotifications(false); }}
                          title="Rejeitar"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <span className="admin-username">{username || '{username}'}</span>
        
        <div className="admin-user-menu-container" ref={userMenuRef}>
          <button className="admin-user-avatar" onClick={() => setShowUserMenu(!showUserMenu)}>
            <svg width="49" height="49" viewBox="0 0 49 49" fill="none">
              <circle cx="24.5" cy="24.5" r="23" stroke="white" strokeWidth="2.5"/>
              <circle cx="24.5" cy="17" r="10" fill="white"/>
              <path d="M7 45C7 35 17 28 24.5 28C32 28 42 35 42 45" stroke="white" strokeWidth="2.5"/>
            </svg>
          </button>
          
          {showUserMenu && (
            <div className="admin-user-dropdown">
              <button onClick={() => setShowUserMenu(false)}>
                Perfil
              </button>
              <button onClick={() => { 
                console.log('Botão Sair clicado, onLogout:', typeof onLogout);
                setShowUserMenu(false); 
                if (onLogout) {
                  onLogout();
                } else {
                  console.error('onLogout não está definido!');
                }
              }}>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
