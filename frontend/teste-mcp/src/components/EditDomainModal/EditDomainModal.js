import React, { useState, useEffect, useRef } from 'react';
import '../EditProfileModal/EditProfileModal.css';
import './EditDomainModal.css';
import api from '../../services/api';
import { useToast } from '../ToastContext';

const CODE_REGEX = /^[a-zA-Z0-9_-]+$/;

const EditDomainModal = ({ isOpen, onClose, domainId, onSaved, onDeleted }) => {
  const toast = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [originalCode, setOriginalCode] = useState('');
  const [originalName, setOriginalName] = useState('');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Estado do diálogo de confirmação de exclusão
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !domainId) return;

    setLoading(true);
    setErrorMsg('');
    setFieldErrors({});
    setShowDeleteWarning(false);
    setDeleteConfirmText('');

    api.domains.getAll()
      .then((res) => {
        const domain = res.data?.[0];
        if (domain) {
          setName(domain.name || '');
          setCode(domain.code || '');
          setOriginalCode(domain.code || '');
          setOriginalName(domain.name || '');
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

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.domains.delete(domainId);
      toast.success('Domínio excluído com sucesso.');
      setShowDeleteWarning(false);
      onClose();
      if (onDeleted) onDeleted();
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir domínio');
      setShowDeleteWarning(false);
    } finally {
      setDeleting(false);
    }
  };

  const isDeleteConfirmValid = deleteConfirmText.trim() === originalName.trim();

  if (!isOpen) return null;

  return (
    <>
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
            <button className="ep-btn-delete" onClick={() => setShowDeleteWarning(true)} disabled={loading}>
              Excluir Domínio
            </button>
            <div className="ep-footer-spacer" />
            <button className="ep-btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="ep-btn-save" onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirmação de exclusão ── */}
      {showDeleteWarning && (
        <div className="ep-warning-overlay" onClick={() => !deleting && setShowDeleteWarning(false)}>
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
            <h3>Excluir Domínio</h3>
            <p>
              Esta ação é <strong>irreversível</strong>. Todos os dispositivos, dashboards,
              histórico de dados e configurações serão permanentemente excluídos.
              Todos os membros serão desvinculados do domínio.
            </p>
            <div className="edm-delete-confirm-group">
              <label>Digite o nome do domínio para confirmar:</label>
              <strong className="edm-delete-domain-name">{originalName}</strong>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Nome do domínio"
                disabled={deleting}
                autoFocus
              />
            </div>
            <div className="ep-warning-actions">
              <button
                className="ep-warn-cancel"
                onClick={() => { setShowDeleteWarning(false); setDeleteConfirmText(''); }}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="ep-warn-confirm edm-warn-confirm-delete"
                onClick={handleDeleteConfirm}
                disabled={deleting || !isDeleteConfirmValid}
              >
                {deleting ? 'Excluindo...' : 'Excluir Domínio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditDomainModal;
