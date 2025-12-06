import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import WaitingAccess from './components/WaitingAccess';
import DevicesPage from './components/DevicesPage';
import DashboardPage from './components/DashboardPage';
import AdminDevicesPage from './components/AdminDevicesPage';
import AdminDashboardPage from './components/AdminDashboardPage';
import api from './services/api';

// Páginas disponíveis na aplicação
const PAGES = {
  LOGIN: 'login',
  REGISTER: 'register',
  WAITING: 'waiting',
  DEVICES: 'devices',
  DASHBOARD: 'dashboard',
  ADMIN_DEVICES: 'admin_devices',
  ADMIN_DASHBOARD: 'admin_dashboard'
};

function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.LOGIN);
  const [user, setUser] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dispositivos carregados da API
  const [devices, setDevices] = useState([]);

  // Widgets para dashboard
  const [widgets, setWidgets] = useState([]);

  // Notificações de acesso (admin)
  const [notifications, setNotifications] = useState([]);

  // Lista de todos os usuários (admin)
  const [allUsers, setAllUsers] = useState([]);

  // Dispositivos públicos (para solicitar acesso)
  const [publicDevices, setPublicDevices] = useState([]);

  // Verificar se há token salvo ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      if (api.auth.isAuthenticated()) {
        try {
          const response = await api.auth.me();
          const userData = response.data.user;
          
          setUser({ 
            id: userData.id,
            username: userData.username, 
            email: userData.email 
          });
          setHasAccess(userData.hasAccess);
          setIsAdmin(userData.role === 'admin');
          
          // Navegar para página correta
          if (userData.role === 'admin') {
            setCurrentPage(PAGES.ADMIN_DEVICES);
          } else if (userData.hasAccess) {
            setCurrentPage(PAGES.DEVICES);
          } else {
            setCurrentPage(PAGES.WAITING);
          }
        } catch (err) {
          console.error('Erro ao verificar autenticação:', err);
          api.auth.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Carregar dispositivos quando usuário tiver acesso
  const loadDevices = useCallback(async () => {
    if (!hasAccess && !isAdmin) return;
    
    try {
      const response = await api.devices.getAll();
      setDevices(response.devices || []);
    } catch (err) {
      console.error('Erro ao carregar dispositivos:', err);
      setError('Erro ao carregar dispositivos');
    }
  }, [hasAccess, isAdmin]);

  // Carregar notificações pendentes (admin)
  const loadNotifications = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      const response = await api.access.getPending();
      setNotifications(response.requests || []);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    }
  }, [isAdmin]);

  // Carregar todos os usuários (admin)
  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      const response = await api.users.getAll();
      setAllUsers(response.data?.users || response.users || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  }, [isAdmin]);

  // Carregar dispositivos públicos (para solicitar acesso)
  const loadPublicDevices = useCallback(async () => {
    if (isAdmin) return; // Admin não precisa solicitar acesso
    
    try {
      const response = await api.devices.getPublicList();
      setPublicDevices(response.devices || []);
    } catch (err) {
      console.error('Erro ao carregar dispositivos públicos:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user && (hasAccess || isAdmin)) {
      loadDevices();
    }
    if (user && isAdmin) {
      loadNotifications();
      loadUsers();
    }
    if (user && !isAdmin) {
      loadPublicDevices();
    }
  }, [user, hasAccess, isAdmin, loadDevices, loadNotifications, loadUsers, loadPublicDevices]);

  // Carregar widgets quando dispositivo selecionado
  const loadWidgets = useCallback(async () => {
    if (!selectedDevice) return;
    
    try {
      const response = await api.widgets.getByDevice(selectedDevice.id);
      setWidgets(response.widgets || []);
    } catch (err) {
      console.error('Erro ao carregar widgets:', err);
    }
  }, [selectedDevice]);

  useEffect(() => {
    if (selectedDevice) {
      loadWidgets();
    }
  }, [selectedDevice, loadWidgets]);

  // Handlers de navegação
  const handleLogin = async (credentials) => {
    setError(null);
    try {
      const response = await api.auth.login(credentials.email, credentials.password);
      const userData = response.data.user;
      
      setUser({ 
        id: userData.id,
        username: userData.username, 
        email: userData.email 
      });
      setHasAccess(userData.hasAccess);
      setIsAdmin(userData.role === 'admin');
      
      if (userData.role === 'admin') {
        setCurrentPage(PAGES.ADMIN_DEVICES);
      } else if (userData.hasAccess) {
        setCurrentPage(PAGES.DEVICES);
      } else {
        setCurrentPage(PAGES.WAITING);
      }
    } catch (err) {
      setError(err.message);
      alert(err.message || 'Erro ao fazer login');
    }
  };

  const handleCreateAccount = () => {
    setCurrentPage(PAGES.REGISTER);
  };

  const handleRegisterSuccess = async (formData) => {
    setError(null);
    try {
      await api.auth.register(
        formData.username, 
        formData.email, 
        formData.password,
        formData.requestedDevices || []
      );
      
      // Após cadastro, remove o token (não faz login automático)
      api.auth.logout();
      
      // Mostra mensagem de sucesso e volta para login
      const deviceMsg = formData.requestedDevices?.length > 0 
        ? ' Sua solicitação de acesso aos dispositivos foi enviada para aprovação.'
        : '';
      alert(`Conta criada com sucesso!${deviceMsg} Faça login para continuar.`);
      setCurrentPage(PAGES.LOGIN);
    } catch (err) {
      setError(err.message);
      alert(err.message || 'Erro ao criar conta');
    }
  };

  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    if (isAdmin) {
      setCurrentPage(PAGES.ADMIN_DASHBOARD);
    } else {
      setCurrentPage(PAGES.DASHBOARD);
    }
  };

  const handleBackToDevices = () => {
    setSelectedDevice(null);
    if (isAdmin) {
      setCurrentPage(PAGES.ADMIN_DEVICES);
    } else {
      setCurrentPage(PAGES.DEVICES);
    }
  };

  const handleLogoClick = () => {
    if (user) {
      if (isAdmin) {
        setCurrentPage(PAGES.ADMIN_DEVICES);
      } else if (hasAccess) {
        setCurrentPage(PAGES.DEVICES);
      } else {
        setCurrentPage(PAGES.WAITING);
      }
    } else {
      setCurrentPage(PAGES.LOGIN);
    }
  };

  const handleLogout = () => {
    console.log('Logout chamado!');
    api.auth.logout();
    setUser(null);
    setHasAccess(false);
    setIsAdmin(false);
    setSelectedDevice(null);
    setDevices([]);
    setWidgets([]);
    setNotifications([]);
    setCurrentPage(PAGES.LOGIN);
    console.log('Logout concluído, página:', PAGES.LOGIN);
  };

  // Handlers para notificações de acesso
  const handleAcceptUser = async (notification) => {
    try {
      await api.access.approve(notification.id);
      // Recarregar notificações
      loadNotifications();
    } catch (err) {
      console.error('Erro ao aprovar acesso:', err);
      alert('Erro ao aprovar acesso');
    }
  };

  const handleRejectUser = async (notification) => {
    try {
      await api.access.reject(notification.id);
      // Recarregar notificações
      loadNotifications();
    } catch (err) {
      console.error('Erro ao rejeitar acesso:', err);
      alert('Erro ao rejeitar acesso');
    }
  };

  // Handler para solicitar acesso a dispositivos (usuário)
  const handleRequestAccess = async (deviceIds, message) => {
    for (const deviceId of deviceIds) {
      try {
        await api.access.create(deviceId, message);
      } catch (err) {
        console.error('Erro ao solicitar acesso:', err);
        throw err;
      }
    }
  };

  const handleDownloadExcel = async (chartType) => {
    if (!selectedDevice) return;
    
    try {
      const response = await api.mqtt.getWeekData(selectedDevice.id);
      console.log('Dados para Excel:', response.data);
      
      // Converter para CSV
      if (response.data && response.data.length > 0) {
        const csvContent = convertToCSV(response.data);
        downloadCSV(csvContent, `${selectedDevice.name}_${chartType}.csv`);
      } else {
        alert('Nenhum dado disponível para download');
      }
    } catch (err) {
      console.error('Erro ao baixar dados:', err);
      alert('Erro ao baixar dados');
    }
  };

  // Helper para converter dados para CSV
  const convertToCSV = (data) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'object' ? JSON.stringify(value) : value;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  };

  // Helper para download de CSV
  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // Admin handlers
  const handleAddDevice = async (deviceData) => {
    try {
      const response = await api.devices.create(deviceData);
      setDevices([...devices, response.device]);
      return response.device;
    } catch (err) {
      console.error('Erro ao criar dispositivo:', err);
      throw err;
    }
  };

  const handleEditDevice = async (deviceId, deviceData) => {
    try {
      const response = await api.devices.update(deviceId, deviceData);
      setDevices(devices.map(d => 
        d.id === deviceId ? response.device : d
      ));
      return response.device;
    } catch (err) {
      console.error('Erro ao editar dispositivo:', err);
      throw err;
    }
  };

  const handleDeleteDevice = async (device) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${device.name}"?`)) {
      return;
    }
    
    try {
      await api.devices.delete(device.id);
      setDevices(devices.filter(d => d.id !== device.id));
      
      if (selectedDevice?.id === device.id) {
        setSelectedDevice(null);
        setCurrentPage(PAGES.ADMIN_DEVICES);
      }
    } catch (err) {
      console.error('Erro ao excluir dispositivo:', err);
      alert('Erro ao excluir dispositivo');
    }
  };

  // Verificar acesso periodicamente (polling)
  useEffect(() => {
    if (!user || hasAccess || isAdmin) return;

    const checkAccess = async () => {
      try {
        const response = await api.auth.me();
        if (response.data.user.hasAccess) {
          setHasAccess(true);
          setCurrentPage(PAGES.DEVICES);
        }
      } catch (err) {
        console.error('Erro ao verificar acesso:', err);
      }
    };

    const interval = setInterval(checkAccess, 10000); // A cada 10 segundos
    return () => clearInterval(interval);
  }, [user, hasAccess, isAdmin]);

  // Loading screen
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#0a0a1a',
        color: '#84B6F4'
      }}>
        <p>Carregando...</p>
      </div>
    );
  }

  // Renderizar página atual
  const renderPage = () => {
    switch (currentPage) {
      case PAGES.LOGIN:
        return (
          <LoginPage 
            key="login-page"
            onLogin={handleLogin}
            onCreateAccount={handleCreateAccount}
            error={error}
          />
        );
      
      case PAGES.REGISTER:
        return (
          <RegisterPage 
            onBackToLogin={() => setCurrentPage(PAGES.LOGIN)}
            onRegisterSuccess={handleRegisterSuccess}
            error={error}
          />
        );
      
      case PAGES.WAITING:
        return (
          <WaitingAccess 
            username={user?.username}
            onRequestAccess={handleRequestAccess}
            onLogout={handleLogout}
          />
        );
      
      case PAGES.DEVICES:
        return (
          <DevicesPage 
            username={user?.username}
            devices={devices}
            onDeviceClick={handleDeviceClick}
            onLogout={handleLogout}
            onLogoClick={handleLogoClick}
            availableDevices={publicDevices}
            onRequestAccess={handleRequestAccess}
          />
        );
      
      case PAGES.DASHBOARD:
        return (
          <DashboardPage 
            username={user?.username}
            deviceName={selectedDevice?.name}
            device={selectedDevice}
            widgets={widgets}
            onDownloadExcel={handleDownloadExcel}
            onBackToDevices={handleBackToDevices}
            onLogout={handleLogout}
          />
        );
      
      case PAGES.ADMIN_DEVICES:
        return (
          <AdminDevicesPage 
            username={user?.username}
            devices={devices}
            setDevices={setDevices}
            onDeviceClick={handleDeviceClick}
            onAddDevice={handleAddDevice}
            onEditDevice={handleEditDevice}
            onDeleteDevice={handleDeleteDevice}
            onNavigateToDashboard={() => setCurrentPage(PAGES.ADMIN_DASHBOARD)}
            onCreateGraph={() => {
              setSelectedDevice(devices[0] || null);
              setCurrentPage(PAGES.ADMIN_DASHBOARD);
            }}
            onLogout={handleLogout}
            onRefresh={loadDevices}
            notifications={notifications}
            onAcceptUser={handleAcceptUser}
            onRejectUser={handleRejectUser}
            allUsers={allUsers}
          />
        );
      
      case PAGES.ADMIN_DASHBOARD:
        return (
          <AdminDashboardPage 
            username={user?.username}
            deviceName={selectedDevice?.name}
            device={selectedDevice}
            widgets={widgets}
            setWidgets={setWidgets}
            onDownloadExcel={handleDownloadExcel}
            onBackToDevices={handleBackToDevices}
            onLogout={handleLogout}
            onRefreshWidgets={loadWidgets}
            notifications={notifications}
            onAcceptUser={handleAcceptUser}
            onRejectUser={handleRejectUser}
          />
        );
      
      default:
        return <LoginPage onLogin={handleLogin} onCreateAccount={handleCreateAccount} />;
    }
  };

  return (
    <div className="app">
      {renderPage()}
    </div>
  );
}

export default App;
