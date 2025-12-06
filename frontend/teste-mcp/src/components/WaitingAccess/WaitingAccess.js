import React from 'react';
import './WaitingAccess.css';
import Header from '../Header';
import Footer from '../Footer';
import waitingImage from '../../assets/waiting-image.png';

const WaitingAccess = ({ username, onLogout }) => {
  return (
    <div className="waiting-access-container">
      <Header username={username} onLogout={onLogout} isOnDevicesPage={true} />
      
      <main className="waiting-content">
        <div className="waiting-image-container">
          <img src={waitingImage} alt="Aguardando acesso" className="waiting-image" />
        </div>
        
        <h2 className="waiting-message">
          Esperando receber acesso ao(s) dashboard(s)...
        </h2>

        <div className="loading-animation">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WaitingAccess;
