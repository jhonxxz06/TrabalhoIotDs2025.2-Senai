import React, { useEffect, useState } from 'react';
import './Toast.css';

const Toast = ({ message, type = 'info', duration = 4000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Iniciar animação de saída 300ms antes de remover
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    // Remover o toast após a animação
    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`toast toast-${type} ${isExiting ? 'toast-exit' : ''}`}>
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={handleClose}>×</button>
    </div>
  );
};

export default Toast;
