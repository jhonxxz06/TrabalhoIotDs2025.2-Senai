import React, { useState, useEffect, useRef } from 'react';
import '../EditProfileModal/EditProfileModal.css';
import './EditDomainModal.css';
import api from '../../services/api';
import { useToast } from '../ToastContext';

const CODE_REGEX = /^[a-zA-Z0-9_-]+$/;

const EditDomainModal = ({ isOpen, onClose, domainId, onSaved }) => {
  const toast = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [originalCode, setOriginalCode] = useState('');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !domainId) return;

    setLoading(true);
    setErrorMsg('');
    setFieldErrors({});

    api.domains.getAll()
      .then((res) => {
        const domain = res.data?.[0];
        if (domain) {
          setName(domain.name || '');
          setCode(domain.code || '');
          setOriginalCode(domain.code || '');
        }
      })
      .catch(() => setErrorMsg('Erro ao carregar dados do domínio'))
      .finally(() => setLoading(false));
  }, [isOpen, domainId]);

  const handleOverlayClick = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose();
    }
  };

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Nome do domínio é obrigatório';
    if (!code.trim()) {
      errors.code = 'Código do domínio é obrigatório';
    } else if (!CODE_REGEX.test(code.trim())) {
      errors.code = 'Código deve conter apenas letras, números, _ ou -';
    }
    return errors;
  };

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
      const res = await api.domains.update(domainId, {
        name: name.trim(),
        code: code.trim()
      });
      toast.success('Domínio atualizado com sucesso!');
      if (onSaved && res?.data) onSaved(res.data);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-profile-overlay" onClick={handleOverlayClick}>
      <div className="edit-profile-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <div className="ep-header">
          <h2>Editar Domínio</h2>
          <button className="ep-close-btn" onClick={onClose} title="Fechar">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="ep-body">
          <p className="ep-role-label">Configurações do Domínio</p>

          {loading && <p className="edm-loading">Carregando...</p>}
          {errorMsg && <div className="ep-error-banner">{errorMsg}</div>}

          <div className="ep-form-group">
            <label>Nome do domínio</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
              className={fieldErrors.name ? 'ep-input-error' : ''}
              disabled={loading}
            />
            {fieldErrors.name && <span className="ep-field-error">{fieldErrors.name}</span>}
          </div>

          <div className="ep-form-group">
            <label>Código do domínio</label>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setFieldErrors(p => ({ ...p, code: '' })); }}
              className={fieldErrors.code ? 'ep-input-error' : ''}
              disabled={loading}
            />
            {fieldErrors.code && <span className="ep-field-error">{fieldErrors.code}</span>}
          </div>

          {code.trim() && originalCode && code.trim() !== originalCode && (
            <div className="edm-code-notice">
              Alterar o código <strong>não remove</strong> membros já vinculados ao domínio.
              Novos usuários precisarão usar o código atualizado para entrar.
            </div>
          )}
        </div>

        <div className="ep-footer">
          <div className="ep-footer-spacer" />
          <button className="ep-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="ep-btn-save" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDomainModal;
