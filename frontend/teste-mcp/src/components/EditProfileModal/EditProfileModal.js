import React, { useState, useEffect, useRef } from 'react';
import './EditProfileModal.css';
import api from '../../services/api';
import { useToast } from '../ToastContext';

/**
 * EditProfileModal
 * Shown as a slide-down panel anchored below the header (right side).
 * Clicking the backdrop overlay closes it.
 *
 * Props:
 *  isOpen        – boolean
 *  onClose       – () => void
 *  user          – { id, username, email }
 *  isAdmin       – boolean  (used for the role label)
 *  onSaved       – (updatedUser) => void   (called after successful save)
 *  onLogout      – () => void              (called after delete/leave)
 */
const EditProfileModal = ({ isOpen, onClose, user, isAdmin, onSaved, onLogout }) => {
  const toast = useToast();
  // Form state
  const [username, setUsername]           = useState('');
  const [email, setEmail]                 = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]     = useState('');

  // UI state
  const [saving, setSaving]               = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');
  const [fieldErrors, setFieldErrors]     = useState({});

  // Warning dialog state: null | 'leave' | 'transfer' | 'delete'
  const [warning, setWarning]             = useState(null);
  const [warningLoading, setWarningLoading] = useState(false);

  // Candidatos para transferência de posse (quando o admin é o único da área)
  const [transferCandidates, setTransferCandidates] = useState([]);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState(null);

  const panelRef = useRef(null);

  // Populate form when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setErrorMsg('');
      setFieldErrors({});
      setWarning(null);
      setTransferCandidates([]);
      setSelectedTransferUserId(null);
    }
  }, [isOpen, user]);

  // Close on outside click
  const handleOverlayClick = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose();
    }
  };

  // ── Client-side validation ──────────────────────────────────────────────
  const validate = () => {
    const errors = {};

    if (!username.trim()) errors.username = 'Nome de usuário é obrigatório';
    if (!email.trim())    errors.email    = 'E-mail é obrigatório';

    if (newPassword) {
      if (!currentPassword) {
        errors.currentPassword = 'Informe a senha atual para alterar a senha';
      }
      if (newPassword === currentPassword) {
        errors.newPassword = 'A nova senha deve ser diferente da senha atual';
      }
      if (newPassword.length < 6) {
        errors.newPassword = errors.newPassword || 'A nova senha deve ter ao menos 6 caracteres';
      }
    }

    return errors;
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setErrorMsg('');
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const body = { username: username.trim(), email: email.trim() };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword     = newPassword;
      }
      const res = await api.auth.updateProfile(body);
      if (onSaved && res?.data?.user) onSaved(res.data.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  // ── Leave domain ────────────────────────────────────────────────────────
  const handleLeaveDomainConfirm = async () => {
    setWarningLoading(true);
    try {
      const res = await api.auth.leaveDomain();
      if (res?.requiresTransfer) {
        setTransferCandidates(res.candidates || []);
        setSelectedTransferUserId(res.candidates?.[0]?.id ?? null);
        setWarning('transfer');
        return;
      }
      toast.success('Você saiu do domínio com sucesso.');
      setWarning(null);
      onClose();
      if (onLogout) onLogout();
    } catch (err) {
      toast.error(err.message || 'Erro ao sair do domínio');
      setWarning(null);
    } finally {
      setWarningLoading(false);
    }
  };

  // ── Transfer ownership and leave domain ─────────────────────────────────
  const handleTransferAndLeave = async () => {
    if (!selectedTransferUserId) return;
    setWarningLoading(true);
    try {
      await api.auth.leaveDomain(selectedTransferUserId);
      toast.success('Posse transferida e saída realizada com sucesso.');
      setWarning(null);
      onClose();
      if (onLogout) onLogout();
    } catch (err) {
      toast.error(err.message || 'Erro ao transferir posse e sair do domínio');
    } finally {
      setWarningLoading(false);
    }
  };

  // ── Delete account ──────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setWarningLoading(true);
    try {
      await api.auth.deleteAccount();
      toast.success('Conta excluída com sucesso.');
      setWarning(null);
      onClose();
      if (onLogout) onLogout();
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir conta');
      setWarning(null);
    } finally {
      setWarningLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="edit-profile-overlay" onClick={handleOverlayClick}>
        {/* Panel */}
        <div className="edit-profile-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="ep-header">
            <h2>Editar Perfil</h2>
            <button className="ep-close-btn" onClick={onClose} title="Fechar">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="ep-body">
            <p className="ep-role-label">
              {isAdmin ? 'Perfil Administrador' : 'Perfil Usuário'}
            </p>

            {errorMsg && <div className="ep-error-banner">{errorMsg}</div>}

            {/* Username */}
            <div className="ep-form-group">
              <label>Nome de usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: '' })); }}
                className={fieldErrors.username ? 'ep-input-error' : ''}
              />
              {fieldErrors.username && <span className="ep-field-error">{fieldErrors.username}</span>}
            </div>

            {/* Email */}
            <div className="ep-form-group">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value.toLowerCase()); setFieldErrors(p => ({ ...p, email: '' })); }}
                className={fieldErrors.email ? 'ep-input-error' : ''}
              />
              {fieldErrors.email && <span className="ep-field-error">{fieldErrors.email}</span>}
            </div>

            {/* Current password (only required when changing password) */}
            <div className="ep-form-group">
              <label>Senha atual (necessária para alterar a senha)</label>
              <input
                type="password"
                value={currentPassword}
                placeholder="Digite a senha atual"
                onChange={(e) => { setCurrentPassword(e.target.value); setFieldErrors(p => ({ ...p, currentPassword: '' })); }}
                className={fieldErrors.currentPassword ? 'ep-input-error' : ''}
              />
              {fieldErrors.currentPassword && <span className="ep-field-error">{fieldErrors.currentPassword}</span>}
            </div>

            {/* New password */}
            <div className="ep-form-group">
              <label>Nova senha (deixe em branco para não alterar)</label>
              <input
                type="password"
                value={newPassword}
                placeholder="Nova senha"
                onChange={(e) => { setNewPassword(e.target.value); setFieldErrors(p => ({ ...p, newPassword: '' })); }}
                className={fieldErrors.newPassword ? 'ep-input-error' : ''}
              />
              {fieldErrors.newPassword && <span className="ep-field-error">{fieldErrors.newPassword}</span>}
            </div>

            {/* Leave domain */}
            <div className="ep-leave-domain-row">
              <button className="ep-btn-leave-domain" onClick={() => setWarning('leave')}>
                Sair do Domínio
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="ep-footer">
            <button className="ep-btn-delete" onClick={() => setWarning('delete')}>
              Excluir Conta
            </button>
            <div className="ep-footer-spacer" />
            <button className="ep-btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="ep-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Warning: Leave Domain ── */}
      {warning === 'leave' && (
        <div className="ep-warning-overlay" onClick={() => !warningLoading && setWarning(null)}>
          <div className="ep-warning-box" onClick={(e) => e.stopPropagation()}>
            <div className="ep-warning-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3>Sair do Domínio</h3>
            <p>
              Tem certeza que deseja sair do domínio atual?<br/>
              Você perderá o acesso a todos os dispositivos e precisará entrar em um novo domínio para continuar.
            </p>
            <div className="ep-warning-actions">
              <button className="ep-warn-cancel" onClick={() => setWarning(null)} disabled={warningLoading}>
                Cancelar
              </button>
              <button className="ep-warn-confirm" onClick={handleLeaveDomainConfirm} disabled={warningLoading}>
                {warningLoading ? 'Aguarde...' : 'Confirmar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warning: Transfer Ownership before leaving ── */}
      {warning === 'transfer' && (
        <div className="ep-warning-overlay" onClick={() => !warningLoading && setWarning(null)}>
          <div className="ep-warning-box" onClick={(e) => e.stopPropagation()}>
            <div className="ep-warning-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3>Transferir posse do domínio</h3>
            <p>
              Você é o único administrador deste domínio. Escolha quem se tornará o novo
              administrador antes de sair.
            </p>
            <div className="ep-transfer-list">
              {transferCandidates.map((candidate) => (
                <label key={candidate.id} className="ep-transfer-option">
                  <input
                    type="radio"
                    name="transferToUserId"
                    value={candidate.id}
                    checked={selectedTransferUserId === candidate.id}
                    onChange={() => setSelectedTransferUserId(candidate.id)}
                  />
                  <span>
                    <strong>{candidate.username}</strong> ({candidate.email})
                  </span>
                </label>
              ))}
            </div>
            <div className="ep-warning-actions">
              <button className="ep-warn-cancel" onClick={() => setWarning(null)} disabled={warningLoading}>
                Cancelar
              </button>
              <button
                className="ep-warn-confirm"
                onClick={handleTransferAndLeave}
                disabled={warningLoading || !selectedTransferUserId}
              >
                {warningLoading ? 'Aguarde...' : 'Confirmar transferência e sair'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warning: Delete Account ── */}
      {warning === 'delete' && (
        <div className="ep-warning-overlay" onClick={() => !warningLoading && setWarning(null)}>
          <div className="ep-warning-box" onClick={(e) => e.stopPropagation()}>
            <div className="ep-warning-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/>
                <path d="M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h3>Excluir Conta</h3>
            <p>
              Esta ação é <strong>irreversível</strong>. Todos os seus dados serão permanentemente excluídos e você perderá o acesso à plataforma.<br/><br/>
              Tem certeza que deseja continuar?
            </p>
            <div className="ep-warning-actions">
              <button className="ep-warn-cancel" onClick={() => setWarning(null)} disabled={warningLoading}>
                Cancelar
              </button>
              <button className="ep-warn-confirm" onClick={handleDeleteConfirm} disabled={warningLoading}>
                {warningLoading ? 'Aguarde...' : 'Excluir Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditProfileModal;
