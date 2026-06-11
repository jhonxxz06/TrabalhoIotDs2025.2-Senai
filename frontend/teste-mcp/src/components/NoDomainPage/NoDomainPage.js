import React, { useState, useCallback } from 'react';
import './NoDomainPage.css';
import logo from '../../assets/logo.png';
import Footer from '../Footer';
import { domains as domainsApi } from '../../services/api';
import { useToast } from '../ToastContext';

const NoDomainPage = ({ username, onLogout, onJoinDomain, onCreateDomain }) => {
  const toast = useToast();

  // Opção A: solicitar acesso a um domínio existente
  const [joinCode, setJoinCode] = useState('');
  const [domainVerified, setDomainVerified] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [joining, setJoining] = useState(false);

  // Opção B: criar meu próprio domínio
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainCode, setNewDomainCode] = useState('');
  const [creating, setCreating] = useState(false);

  const handleJoinCodeChange = (e) => {
    setJoinCode(e.target.value);
    setDomainVerified(false);
    setDomainError('');
    setAvailableDevices([]);
    setSelectedDevices([]);
  };

  const handleJoinCodeBlur = useCallback(async () => {
    const code = joinCode.trim();
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
  }, [joinCode]);

  const handleDeviceToggle = (deviceId) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId]
    );
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;

    setJoining(true);
    try {
      await onJoinDomain(code, selectedDevices);
      toast.success('Solicitação de acesso enviada com sucesso!');
    } catch (err) {
      toast.error(err.message || 'Erro ao solicitar acesso ao domínio');
    } finally {
      setJoining(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const name = newDomainName.trim();
    const code = newDomainCode.trim();
    if (!name || !code) return;

    setCreating(true);
    try {
      await onCreateDomain(name, code);
      toast.success('Domínio criado com sucesso!');
    } catch (err) {
      toast.error(err.message || 'Erro ao criar domínio');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="no-domain-container">
      <header className="no-domain-header">
        <img src={logo} alt="Logo" className="no-domain-logo" />
        <div className="no-domain-header-right">
          <span className="no-domain-username">{username || '{username}'}</span>
          <button className="no-domain-logout-btn" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="no-domain-content">
        <h1 className="no-domain-title">Você ainda não pertence a um domínio</h1>
        <p className="no-domain-subtitle">
          Solicite acesso a um domínio existente ou crie o seu próprio para continuar.
        </p>

        <div className="no-domain-options">
          {/* Opção A: solicitar acesso */}
          <form className="no-domain-card" onSubmit={handleJoinSubmit}>
            <h2>Solicitar acesso a um domínio</h2>

            <div className="no-domain-field">
              <label>
                Código do domínio
                {verifyingDomain && <span className="domain-verifying"> verificando...</span>}
                {domainVerified && <span className="domain-verified"> ✓</span>}
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={handleJoinCodeChange}
                onBlur={handleJoinCodeBlur}
                placeholder="Informe o código do domínio"
                className={domainError ? 'no-domain-input-error' : domainVerified ? 'no-domain-input-success' : ''}
                required
              />
              {domainError && <span className="no-domain-error-msg">{domainError}</span>}
            </div>

            {domainVerified && availableDevices.length > 0 && (
              <div className="no-domain-field">
                <label>Dispositivos desejados (opcional)</label>
                <div className="no-domain-devices-list">
                  {availableDevices.map((device) => (
                    <label key={device.id} className="no-domain-device-item">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={() => handleDeviceToggle(device.id)}
                      />
                      <span>{device.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="no-domain-submit-btn" disabled={joining}>
              {joining ? 'Enviando...' : 'Solicitar Acesso'}
            </button>
          </form>

          {/* Opção B: criar domínio */}
          <form className="no-domain-card" onSubmit={handleCreateSubmit}>
            <h2>Criar meu próprio domínio</h2>

            <div className="no-domain-field">
              <label>Nome do domínio</label>
              <input
                type="text"
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                placeholder="Ex: SENAI Florianópolis"
                required
              />
            </div>

            <div className="no-domain-field">
              <label>Código do domínio</label>
              <input
                type="text"
                value={newDomainCode}
                onChange={(e) => setNewDomainCode(e.target.value)}
                placeholder="Ex: SENAI-FLN-2025"
                required
              />
            </div>

            <button type="submit" className="no-domain-submit-btn" disabled={creating}>
              {creating ? 'Criando...' : 'Criar Domínio'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NoDomainPage;
