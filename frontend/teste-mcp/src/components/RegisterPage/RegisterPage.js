import React, { useState, useEffect, useCallback } from 'react';
import './RegisterPage.css';
import logo from '../../assets/logo.png';
import background from '../../assets/background.png';
import { domains as domainsApi } from '../../services/api';

const ClearIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#49454F"/>
  </svg>
);

const RegisterPage = ({ onBackToLogin, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    domainCode: '',
    domainName: ''
  });
  const [isManager, setIsManager] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Seleção de dispositivos (fluxo não-gerente)
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [domainVerified, setDomainVerified] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [verifyingDomain, setVerifyingDomain] = useState(false);

  // Reseta o estado de domínio quando troca o modo
  useEffect(() => {
    setAvailableDevices([]);
    setSelectedDevices([]);
    setDomainVerified(false);
    setDomainError('');
    setFormData(prev => ({ ...prev, domainCode: '', domainName: '' }));
    setShowDeviceDropdown(false);
  }, [isManager]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Force email to lowercase regardless of CAPS LOCK state
    const normalizedValue = name === 'email' ? value.toLowerCase() : value;
    setFormData(prev => ({ ...prev, [name]: normalizedValue }));

    // Reseta verificação se o código de domínio mudar
    if (name === 'domainCode') {
      setDomainVerified(false);
      setDomainError('');
      setAvailableDevices([]);
      setSelectedDevices([]);
    }
  };

  // Verifica o código de domínio ao sair do campo (onBlur) — apenas fluxo não-gerente
  const handleDomainCodeBlur = useCallback(async () => {
    if (isManager) return;
    const code = formData.domainCode.trim();
    if (!code) return;

    setVerifyingDomain(true);
    setDomainError('');
    try {
      const res = await domainsApi.verify(code);
      if (res.success) {
        setDomainVerified(true);
        setAvailableDevices(res.data.devices || []);
      }
    } catch (err) {
      setDomainVerified(false);
      setDomainError(err.message || 'Domínio não encontrado');
      setAvailableDevices([]);
    } finally {
      setVerifyingDomain(false);
    }
  }, [isManager, formData.domainCode]);

  const handleDeviceToggle = (deviceId) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId]
    );
  };

  const getSelectedDevicesText = () => {
    if (selectedDevices.length === 0) return 'Selecione os dispositivos';
    const names = selectedDevices.map(id => {
      const device = availableDevices.find(d => d.id === id);
      return device ? device.name : '';
    }).filter(Boolean);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (onRegisterSuccess) {
        await onRegisterSuccess({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          isManager,
          domainName: formData.domainName,
          domainCode: formData.domainCode,
          requestedDevices: selectedDevices
        });
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      {/* Background Image */}
      <div
        className="background-image"
        style={{ backgroundImage: `url(${background})` }}
      />

      {/* Register Card */}
      <div className="register-card">
        {/* Logo */}
        <div className="logo-container">
          <img src={logo} alt="Logo" className="logo" />
        </div>

        {/* Form */}
        <form className="register-form" onSubmit={handleSubmit}>

          {/* Username Field */}
          <div className="text-field">
            <div className="text-field-container">
              <div className="text-field-content">
                <label className="text-field-label">Nome de usuário</label>
                <input
                  type="text"
                  name="username"
                  className="text-field-input"
                  placeholder="Digite seu nome de usuário"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              <button
                type="button"
                className="trailing-icon"
                onClick={() => setFormData(prev => ({ ...prev, username: '' }))}
                aria-label="Limpar username"
              >
                <ClearIcon />
              </button>
            </div>
            <div className="active-indicator" />
          </div>

          {/* Email Field */}
          <div className="text-field">
            <div className="text-field-container">
              <div className="text-field-content">
                <label className="text-field-label">E-mail</label>
                <input
                  type="email"
                  name="email"
                  className="text-field-input"
                  placeholder="Digite seu e-mail"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <button
                type="button"
                className="trailing-icon"
                onClick={() => setFormData(prev => ({ ...prev, email: '' }))}
                aria-label="Limpar e-mail"
              >
                <ClearIcon />
              </button>
            </div>
            <div className="active-indicator" />
          </div>

          {/* Password Field */}
          <div className="text-field password-field">
            <div className="text-field-container">
              <div className="text-field-content">
                <label className="text-field-label">Senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="text-field-input"
                  placeholder="Digite sua senha"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <button
                type="button"
                className="trailing-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="#49454F"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.64 13.83L19.56 16.75C21.07 15.49 22.26 13.86 22.99 12C21.26 7.61 16.99 4.5 11.99 4.5C10.59 4.5 9.25 4.75 8.01 5.2L10.17 7.36C10.74 7.13 11.35 7 12 7ZM2 4.27L4.28 6.55L4.74 7.01C3.08 8.3 1.78 10.02 1 12C2.73 16.39 7 19.5 12 19.5C13.55 19.5 15.03 19.2 16.38 18.66L16.8 19.08L19.73 22L21 20.73L3.27 3L2 4.27ZM7.53 9.8L9.08 11.35C9.03 11.56 9 11.78 9 12C9 13.66 10.34 15 12 15C12.22 15 12.44 14.97 12.65 14.92L14.2 16.47C13.53 16.8 12.79 17 12 17C9.24 17 7 14.76 7 12C7 11.21 7.2 10.47 7.53 9.8ZM11.84 9.02L14.99 12.17L15.01 12.01C15.01 10.35 13.67 9.01 12.01 9.01L11.84 9.02Z" fill="#49454F"/>
                  </svg>
                )}
              </button>
            </div>
            <div className="active-indicator" />
          </div>

          {/* ── Sou Gerente Checkbox ─────────────────────────────────────── */}
          <div className="manager-checkbox-row">
            <span className="manager-label">Sou gerente</span>
            <label className="manager-checkbox-wrapper" htmlFor="isManagerCheckbox">
              <input
                id="isManagerCheckbox"
                type="checkbox"
                className="manager-checkbox-input"
                checked={isManager}
                onChange={e => setIsManager(e.target.checked)}
              />
              <span className="manager-checkbox-custom" aria-hidden="true">
                {isManager && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#fff"/>
                  </svg>
                )}
              </span>
            </label>
          </div>

          {/* ── Campos condicionais ──────────────────────────────────────── */}
          {isManager ? (
            /* GERENTE: Nome do Domínio + Código do Domínio lado a lado */
            <div className="domain-fields-row">
              <div className="text-field domain-field-half">
                <div className="text-field-container">
                  <div className="text-field-content">
                    <label className="text-field-label">Nome do Domínio</label>
                    <input
                      type="text"
                      name="domainName"
                      className="text-field-input"
                      placeholder="Ex: SENAI Florianópolis"
                      value={formData.domainName}
                      onChange={handleChange}
                      required={isManager}
                    />
                  </div>
                  <button
                    type="button"
                    className="trailing-icon"
                    onClick={() => setFormData(prev => ({ ...prev, domainName: '' }))}
                    aria-label="Limpar nome do domínio"
                  >
                    <ClearIcon />
                  </button>
                </div>
                <div className="active-indicator" />
              </div>

              <div className="text-field domain-field-half">
                <div className="text-field-container">
                  <div className="text-field-content">
                    <label className="text-field-label">Código do Domínio</label>
                    <input
                      type="text"
                      name="domainCode"
                      className="text-field-input"
                      placeholder="Ex: SENAI-FLN-2025"
                      value={formData.domainCode}
                      onChange={handleChange}
                      required={isManager}
                    />
                  </div>
                  <button
                    type="button"
                    className="trailing-icon"
                    onClick={() => setFormData(prev => ({ ...prev, domainCode: '' }))}
                    aria-label="Limpar código do domínio"
                  >
                    <ClearIcon />
                  </button>
                </div>
                <div className="active-indicator" />
              </div>
            </div>
          ) : (
            /* USUÁRIO: Código do Domínio (com verificação) + Seletor de Dispositivos */
            <>
              <div className="text-field">
                <div className="text-field-container">
                  <div className="text-field-content">
                    <label className="text-field-label">
                      Código do Domínio
                      {verifyingDomain && <span className="domain-verifying"> verificando...</span>}
                      {domainVerified && <span className="domain-verified"> ✓</span>}
                    </label>
                    <input
                      type="text"
                      name="domainCode"
                      className={`text-field-input ${domainError ? 'input-error' : ''} ${domainVerified ? 'input-success' : ''}`}
                      placeholder="Informe o código do seu domínio"
                      value={formData.domainCode}
                      onChange={handleChange}
                      onBlur={handleDomainCodeBlur}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="trailing-icon"
                    onClick={() => setFormData(prev => ({ ...prev, domainCode: '' }))}
                    aria-label="Limpar código do domínio"
                  >
                    <ClearIcon />
                  </button>
                </div>
                <div className={`active-indicator ${domainError ? 'indicator-error' : ''} ${domainVerified ? 'indicator-success' : ''}`} />
                {domainError && <span className="domain-error-msg">{domainError}</span>}
              </div>

              {/* Seletor de dispositivos — só aparece após domínio verificado */}
              {domainVerified && (
                <div className="device-selector">
                  <div
                    className="menu-item"
                    onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
                  >
                    <div className="menu-item-content">
                      <div className="menu-item-leading">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" fill="#49454F"/>
                        </svg>
                      </div>
                      <span className="menu-item-label">{getSelectedDevicesText()}</span>
                      <div className="menu-item-trailing">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{
                            transform: showDeviceDropdown ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}
                        >
                          <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="#49454F"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {showDeviceDropdown && (
                    <div className="device-dropdown">
                      {availableDevices.length === 0 ? (
                        <div className="device-dropdown-empty">
                          Nenhum dispositivo neste domínio
                        </div>
                      ) : (
                        availableDevices.map(device => (
                          <div
                            key={device.id}
                            className={`device-dropdown-item ${selectedDevices.includes(device.id) ? 'selected' : ''}`}
                            onClick={() => handleDeviceToggle(device.id)}
                          >
                            <div className="device-checkbox">
                              {selectedDevices.includes(device.id) && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#84B6F4"/>
                                </svg>
                              )}
                            </div>
                            <span className="device-name">{device.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Register Button */}
          <button
            type="submit"
            className={`register-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            <span className="button-text">
              {isLoading ? 'Cadastrando...' : 'Cadastro'}
            </span>
          </button>

          {/* Back to Login Link */}
          <div className="back-to-login">
            <span>Já tem uma conta? </span>
            <button
              type="button"
              className="back-to-login-link"
              onClick={onBackToLogin}
            >
              Faça login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
