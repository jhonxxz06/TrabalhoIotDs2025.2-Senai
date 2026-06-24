import React, { useEffect, useState, useCallback, useRef } from 'react';
import './NotificationSettingsPage.css';
import AdminHeader from '../AdminHeader';
import Footer from '../Footer';
import { domains as domainsApi } from '../../services/api';
import { useToast } from '../ToastContext';

const NotificationSettingsPage = ({
  username,
  domainName,
  domainUserCount,
  domainUserLimit,
  user,
  onUserSaved,
  onLogout,
  onBackToDevices
}) => {
  const [loading, setLoading] = useState(true);
  const [telegramConfig, setTelegramConfig] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const toast = useToast();
  const pollingRef = useRef(null);
  const timerRef = useRef(null);

  const loadConfig = useCallback(async () => {
    if (!user?.domainId) return;
    try {
      const response = await domainsApi.getTelegram(user.domainId);
      setTelegramConfig(response.data);
    } catch (error) {
      toast.error(error.message || 'Erro ao carregar configurações do Telegram');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.domainId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Polling: enquanto há código ativo, verificar se o grupo já conectou
  useEffect(() => {
    if (!telegramConfig?.verificationCode) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const response = await domainsApi.getTelegram(user.domainId);
        const config = response.data;
        if (config.chatId) {
          setTelegramConfig(config);
          clearInterval(pollingRef.current);
          toast.success('Telegram conectado com sucesso!');
        }
      } catch (_) {
        // Erros de polling são silenciosos
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramConfig?.verificationCode, user?.domainId]);

  // Timer do código de verificação
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!telegramConfig?.verificationExpiresAt) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const remaining = new Date(telegramConfig.verificationExpiresAt) - Date.now();
      if (remaining <= 0) {
        setTimeLeft(null);
        setTelegramConfig(prev => prev ? { ...prev, verificationCode: null, verificationExpiresAt: null } : prev);
        clearInterval(timerRef.current);
        return;
      }
      setTimeLeft(remaining);
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [telegramConfig?.verificationExpiresAt]);

  const formatTimeLeft = (ms) => {
    if (!ms) return '';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await domainsApi.generateTelegramCode(user.domainId);
      setTelegramConfig(prev => ({
        ...prev,
        verificationCode: response.data.code,
        verificationExpiresAt: response.data.expiresAt
      }));
    } catch (error) {
      toast.error(error.message || 'Erro ao gerar código de verificação');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCommand = async () => {
    const command = `/conectar ${telegramConfig.verificationCode}`;
    try {
      await navigator.clipboard.writeText(command);
      toast.success('Comando copiado!');
    } catch (_) {
      toast.error('Não foi possível copiar');
    }
  };

  const handleToggleEnabled = async () => {
    setSavingToggle(true);
    const newEnabled = !telegramConfig.enabled;
    try {
      await domainsApi.updateTelegram(user.domainId, {
        chatId: telegramConfig.chatId,
        enabled: newEnabled
      });
      setTelegramConfig(prev => ({ ...prev, enabled: newEnabled }));
      toast.success(newEnabled ? 'Notificações ativadas.' : 'Notificações pausadas.');
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar configuração');
    } finally {
      setSavingToggle(false);
    }
  };

  const handleDisconnect = async () => {
    setShowDisconnectModal(false);
    try {
      await domainsApi.updateTelegram(user.domainId, { chatId: null, enabled: false });
      setTelegramConfig(prev => ({
        ...prev,
        chatId: null,
        chatName: null,
        enabled: false,
        verificationCode: null,
        verificationExpiresAt: null
      }));
      toast.success('Telegram desconectado.');
    } catch (error) {
      toast.error(error.message || 'Erro ao desconectar');
    }
  };

  return (
    <div className="notification-settings-container">
      <AdminHeader
        username={username}
        domainName={domainName}
        domainUserCount={domainUserCount}
        domainUserLimit={domainUserLimit}
        onLogout={onLogout}
        onBackToDevices={onBackToDevices}
        isOnDevicesPage={false}
        isOnDashboard={false}
        user={user}
        onUserSaved={onUserSaved}
      />

      <main className="notification-settings-content">
        <h1 className="notification-settings-title">Configurações de Notificações</h1>

        {loading ? (
          <p className="notification-settings-loading">Carregando...</p>
        ) : (
          <div className="notification-channels-list">

            {/* Card Telegram */}
            <div className="channel-card">
              <div className="channel-card-header">
                <div className="channel-icon telegram-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8L15.11 16.17C15 16.7 14.66 16.83 14.2 16.57L11.7 14.72L10.49 15.89C10.36 16.02 10.24 16.13 9.97 16.13L10.15 13.58L14.82 9.36C15.03 9.17 14.77 9.07 14.49 9.26L8.73 12.9L6.26 12.12C5.74 11.95 5.73 11.6 6.38 11.34L15.95 7.63C16.38 7.47 16.76 7.73 16.64 8.8Z" fill="#2AABEE"/>
                  </svg>
                </div>
                <div className="channel-card-title-group">
                  <h2 className="channel-card-title">Telegram</h2>
                  {telegramConfig?.chatId && (
                    <span className={`channel-status-badge ${telegramConfig.enabled ? 'status-active' : 'status-paused'}`}>
                      {telegramConfig.enabled ? 'Ativo' : 'Pausado'}
                    </span>
                  )}
                </div>
              </div>

              {/* Estado: Conectado */}
              {telegramConfig?.chatId ? (
                <div className="channel-connected">
                  <div className="connected-info">
                    <span className="connected-check">✅</span>
                    <span className="connected-label">
                      Conectado ao grupo <strong>{telegramConfig.chatName || 'Grupo do Telegram'}</strong>
                    </span>
                  </div>

                  <div className="toggle-row">
                    <span className="toggle-label">
                      {telegramConfig.enabled ? 'Notificações ativas' : 'Notificações pausadas'}
                    </span>
                    <button
                      className={`toggle-switch ${telegramConfig.enabled ? 'toggle-on' : 'toggle-off'}`}
                      onClick={handleToggleEnabled}
                      disabled={savingToggle}
                      aria-label="Alternar notificações"
                    >
                      <span className="toggle-knob" />
                    </button>
                  </div>

                  <button
                    className="btn-disconnect"
                    onClick={() => setShowDisconnectModal(true)}
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                /* Estado: Não conectado */
                <div className="channel-disconnected">
                  {!telegramConfig?.verificationCode ? (
                    /* Sem código ativo */
                    <>
                      <p className="channel-description">
                        Conecte um grupo do Telegram para receber alertas quando os valores de monitoramento ultrapassarem os limites configurados.
                      </p>
                      <button
                        className="btn-generate-code"
                        onClick={handleGenerateCode}
                        disabled={generatingCode}
                      >
                        {generatingCode ? 'Gerando...' : 'Gerar código de verificação'}
                      </button>
                    </>
                  ) : (
                    /* Com código ativo */
                    <>
                      <div className="verification-code-block">
                        <span className="verification-code-prefix">CLEANAIR-</span>
                        <span className="verification-code-value">{telegramConfig.verificationCode}</span>
                        <button
                          className="btn-copy"
                          onClick={handleCopyCommand}
                          title="Copiar comando"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>

                      {timeLeft !== null && (
                        <p className="verification-timer">
                          Expira em <strong>{formatTimeLeft(timeLeft)}</strong>
                        </p>
                      )}

                      <ol className="verification-steps">
                        <li>Abra o <strong>Telegram</strong> e acesse o grupo onde deseja receber os alertas.</li>
                        <li>Adicione o bot <strong>@cleanair_alertas_bot</strong> ao grupo.</li>
                        <li>
                          Envie a mensagem no grupo:{' '}
                          <code className="inline-code">/conectar {telegramConfig.verificationCode}</code>
                        </li>
                      </ol>

                      <p className="verification-waiting">
                        <span className="waiting-dot" />
                        Aguardando conexão...
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      <Footer />

      {showDisconnectModal && (
        <div className="modal-overlay" onClick={() => setShowDisconnectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Desconectar Telegram</h3>
            <p>Tem certeza que deseja desconectar o grupo <strong>{telegramConfig?.chatName || 'do Telegram'}</strong>?</p>
            <p className="modal-warning">As notificações de excedência não serão mais enviadas para esse grupo.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowDisconnectModal(false)}>
                Cancelar
              </button>
              <button className="modal-btn confirm-btn" onClick={handleDisconnect}>
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettingsPage;
