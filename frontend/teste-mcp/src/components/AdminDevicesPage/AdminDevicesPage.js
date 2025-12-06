import React, { useState } from 'react';
import './AdminDevicesPage.css';
import AdminHeader from '../AdminHeader';
import Footer from '../Footer';
import DeviceFormModal from '../DeviceFormModal';
import waitingImage from '../../assets/waiting-image.png';
import { devices as devicesApi } from '../../services/api';

const AdminDevicesPage = ({ 
  username, 
  devices = [], 
  setDevices,
  onDeviceClick,
  onNavigateToDashboard,
  onCreateGraph,
  onLogout,
  notifications = [],
  onAcceptUser,
  onRejectUser,
  onRefresh,
  allUsers = []
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const handleDeleteClick = (e, device) => {
    e.stopPropagation();
    setDeviceToDelete(device);
    setShowDeleteModal(true);
  };

  const handleEditClick = async (e, device) => {
    e.stopPropagation();
    try {
      // Busca o dispositivo completo com usuários atribuídos
      const response = await devicesApi.getById(device.id);
      setEditingDevice(response.device || device);
    } catch (error) {
      console.error('Erro ao carregar dispositivo:', error);
      setEditingDevice(device);
    }
    setShowDeviceForm(true);
  };

  const handleAddDevice = () => {
    setEditingDevice(null);
    setShowDeviceForm(true);
  };

  const handleSaveDevice = async (deviceData) => {
    try {
      if (editingDevice) {
        // Editando dispositivo existente
        await devicesApi.update(editingDevice.id, deviceData);
      } else {
        // Criando novo dispositivo
        await devicesApi.create(deviceData);
      }
      // Recarrega a lista de dispositivos do backend
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Erro ao salvar dispositivo:', error);
      alert('Erro ao salvar dispositivo: ' + error.message);
    }
    setShowDeviceForm(false);
    setEditingDevice(null);
  };

  const confirmDelete = async () => {
    if (deviceToDelete) {
      try {
        await devicesApi.delete(deviceToDelete.id);
        // Recarrega a lista de dispositivos do backend
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Erro ao excluir dispositivo:', error);
        alert('Erro ao excluir dispositivo: ' + error.message);
      }
    }
    setShowDeleteModal(false);
    setDeviceToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeviceToDelete(null);
  };

  const hasDevices = devices.length > 0;

  return (
    <div className="admin-devices-container">
      <AdminHeader 
        username={username} 
        onLogout={onLogout}
        onAddDevice={handleAddDevice}
        onBackToDevices={onNavigateToDashboard}
        onCreateGraph={onCreateGraph}
        isOnDevicesPage={true}
        isOnDashboard={false}
        notifications={notifications}
        onAcceptUser={onAcceptUser}
        onRejectUser={onRejectUser}
      />
      
      <main className="admin-devices-content">
        {hasDevices ? (
          <div className="admin-devices-grid">
            {devices.map((device) => (
              <div 
                key={device.id} 
                className="admin-device-card"
                onClick={() => onDeviceClick && onDeviceClick(device)}
              >
                <div className="admin-device-icon">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="admin-device-name">{device.name}</span>
                
                {/* Action Buttons */}
                <div className="admin-device-actions">
                  <button 
                    className="action-btn edit-btn"
                    onClick={(e) => handleEditClick(e, device)}
                    title="Editar dispositivo"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button 
                    className="action-btn delete-btn"
                    onClick={(e) => handleDeleteClick(e, device)}
                    title="Excluir dispositivo"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <div className="empty-image-container">
              <img src={waitingImage} alt="Sem dispositivos" className="empty-image" />
            </div>
            <h2 className="empty-message">
              Sem Dispositivos criados ao momento...
            </h2>
            <button className="add-device-btn" onClick={handleAddDevice}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
              </svg>
              Adicionar Dispositivo
            </button>
          </div>
        )}
      </main>

      <Footer />

      {/* Device Form Modal (Create/Edit) */}
      <DeviceFormModal
        isOpen={showDeviceForm}
        mode={editingDevice ? 'edit' : 'create'}
        device={editingDevice}
        allUsers={allUsers}
        onSave={handleSaveDevice}
        onClose={() => {
          setShowDeviceForm(false);
          setEditingDevice(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir o dispositivo <strong>"{deviceToDelete?.name}"</strong>?</p>
            <p className="modal-warning">Esta ação não pode ser desfeita.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={cancelDelete}>
                Cancelar
              </button>
              <button className="modal-btn confirm-btn" onClick={confirmDelete}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDevicesPage;
