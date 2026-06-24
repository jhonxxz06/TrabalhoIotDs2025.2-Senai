import React, { useState, useEffect, useRef } from 'react';
import './AdminHeader.css';
import logger from '../../utils/logger';
import logo from '../../assets/logo.png';
import EditProfileModal from '../EditProfileModal';

const PlanIcon = ({ plan }) => {
  if (plan === 'comercial') return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{flexShrink:0}}>
      <rect x="2" y="5" width="8" height="6" rx="0.5" fill="currentColor" opacity="0.9"/>
      <rect x="3.5" y="2" width="5" height="4" rx="0.5" fill="currentColor" opacity="0.6"/>
    </svg>
  );
  if (plan === 'empresarial') return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{flexShrink:0}}>
      <rect x="1" y="5" width="4" height="6" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="7" y="5" width="4" height="6" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="3" y="3" width="6" height="8" rx="0.5" fill="currentColor"/>
    </svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{flexShrink:0}}>
      <path d="M9 6c0-1.657-1.343-3-3-3S3 4.343 3 6c-.828 0-1.5.672-1.5 1.5S2.172 9 3 9h6c.828 0 1.5-.672 1.5-1.5S9.828 6 9 6z" fill="currentColor"/>
    </svg>
  );
};

const AdminHeader = ({
  username,
  domainName,
  domainUserCount,
  domainUserLimit,
  domainPlan = 'gratuito',
  domainDeviceCount = 0,
  domainDeviceLimit = 3,
  isDeviceLimitReached = false,
  onLogout,
  onAddDevice,
  onCreateGraph,
  onBackToDevices,
  onNavigateToMembers,
  onNavigateToSettings,
  onNavigateToPlans,
  isOnDevicesPage = true,
  isOnDashboard = false,
  notifications = [],
  onAcceptUser,
  onRejectUser,
  user,
  onUserSaved
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
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
        {!isOnDevicesPage ? (
          <button className="back-button" onClick={onBackToDevices}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="white"/>
            </svg>
            <span>Voltar</span>
          </button>
        ) : (
          domainName && (
            <span className="header-domain-name">
              {domainName}
              {domainPlan && (
                <span className={`header-plan-badge header-plan-badge--${domainPlan}`}>
                  <PlanIcon plan={domainPlan} />
                  {domainPlan.charAt(0).toUpperCase() + domainPlan.slice(1)}
                </span>
              )}
              {domainUserLimit != null && (
                <span className="header-user-count">{domainUserCount}/{domainUserLimit}</span>
              )}
              {domainDeviceLimit != null && (
                <span className="header-device-count">{domainDeviceCount}/{domainDeviceLimit} disp.</span>
              )}
            </span>
          )
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
            onClick={isDeviceLimitReached ? undefined : onAddDevice}
            title={isDeviceLimitReached ? `Limite de dispositivos atingido (máx. ${domainDeviceLimit})` : 'Adicionar Dispositivo'}
            style={isDeviceLimitReached ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="13" rx="2" stroke="white" strokeWidth="2"/>
              <path d="M8 21H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 17V21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 8V14M9 11H15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {/* Ícone de Membros do Domínio - SÓ na página de dispositivos */}
        {isOnDevicesPage && (
          <button
            className="admin-icon-button"
            onClick={onNavigateToMembers}
            title="Membros"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="white"/>
            </svg>
          </button>
        )}

        {/* Ícone de Configurações (engrenagem) - SÓ na página de dispositivos */}
        {isOnDevicesPage && (
          <button
            className="admin-icon-button"
            onClick={onNavigateToSettings}
            title="Configurações"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M19.14 12.94C19.18 12.64 19.2 12.33 19.2 12C19.2 11.68 19.18 11.36 19.13 11.06L21.16 9.48C21.34 9.34 21.39 9.07 21.28 8.87L19.36 5.55C19.24 5.33 18.99 5.26 18.77 5.33L16.38 6.29C15.88 5.91 15.35 5.59 14.76 5.35L14.4 2.81C14.36 2.57 14.16 2.4 13.92 2.4H10.08C9.84 2.4 9.65 2.57 9.61 2.81L9.25 5.35C8.66 5.59 8.12 5.92 7.63 6.29L5.24 5.33C5.02 5.25 4.77 5.33 4.65 5.55L2.74 8.87C2.62 9.08 2.66 9.34 2.86 9.48L4.89 11.06C4.84 11.36 4.8 11.69 4.8 12C4.8 12.31 4.82 12.64 4.87 12.94L2.84 14.52C2.66 14.66 2.61 14.93 2.72 15.13L4.64 18.45C4.76 18.67 5.01 18.74 5.23 18.67L7.62 17.71C8.12 18.09 8.65 18.41 9.24 18.65L9.6 21.19C9.65 21.43 9.84 21.6 10.08 21.6H13.92C14.16 21.6 14.36 21.43 14.39 21.19L14.75 18.65C15.34 18.41 15.88 18.09 16.37 17.71L18.76 18.67C18.98 18.75 19.23 18.67 19.35 18.45L21.27 15.13C21.39 14.91 21.34 14.66 21.15 14.52L19.14 12.94ZM12 15.6C10.02 15.6 8.4 13.98 8.4 12C8.4 10.02 10.02 8.4 12 8.4C13.98 8.4 15.6 10.02 15.6 12C15.6 13.98 13.98 15.6 12 15.6Z" fill="white"/>
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
              <button onClick={() => { setShowUserMenu(false); setShowEditProfile(true); }}>
                Editar Perfil
              </button>
              {onNavigateToPlans && (
                <button onClick={() => { setShowUserMenu(false); onNavigateToPlans(); }}>
                  Gerenciar Plano
                </button>
              )}
              <button onClick={() => {
                setShowUserMenu(false);
                if (onLogout) {
                  onLogout();
                } else {
                  logger.error('onLogout não está definido!');
                }
              }}>
                Sair
              </button>
            </div>
          )}

          <EditProfileModal
            isOpen={showEditProfile}
            onClose={() => setShowEditProfile(false)}
            user={user}
            isAdmin={true}
            onSaved={onUserSaved}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
