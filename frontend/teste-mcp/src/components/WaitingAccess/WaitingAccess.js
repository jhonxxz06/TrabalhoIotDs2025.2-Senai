import React, { useState, useEffect } from 'react';
import './WaitingAccess.css';
import Header from '../Header';
import Footer from '../Footer';
import waitingImage from '../../assets/waiting-image.png';
import api from '../../services/api';

const WaitingAccess = ({ username, onLogout }) => {
  const [hasRejection, setHasRejection] = useState(false);

  useEffect(() => {
    // MT-06: verifica se o usuário possui alguma solicitação rejeitada
    const checkRejections = async () => {
      try {
        const response = await api.access.getAll('rejected');
        if (response?.requests?.length > 0) {
          setHasRejection(true);
        }
      } catch (err) {
        // silencioso — não crítico
      }
    };
    checkRejections();
  }, []);

  return (
    <div className="waiting-access-container">
      <Header username={username} onLogout={onLogout} isOnDevicesPage={true} />
      
      <main className="waiting-content">
        <div className="waiting-image-container">
          <img src={waitingImage} alt="Aguardando acesso" className="waiting-image" />
        </div>
        
        {hasRejection ? (
          <>
            <h2 className="waiting-message waiting-message--rejected">
              Sua solicitação de acesso foi recusada.
            </h2>
            <p className="waiting-subtext">
              Entre em contato com o administrador do dispositivo para que ele conceda o acesso diretamente, ou aguarde uma nova liberação.
            </p>
          </>
        ) : (
          <>
            <h2 className="waiting-message">
              Esperando receber acesso ao(s) dashboard(s)...
            </h2>
            <div className="loading-animation">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default WaitingAccess;
