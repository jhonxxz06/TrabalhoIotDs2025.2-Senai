import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import WaitingAccess from './components/WaitingAccess';
import NoDomainPage from './components/NoDomainPage';
import DevicesPage from './components/DevicesPage';
import DashboardPage from './components/DashboardPage';
import AdminDevicesPage from './components/AdminDevicesPage';
import AdminDashboardPage from './components/AdminDashboardPage';
import MembersPage from './components/MembersPage';
import NotificationSettingsPage from './components/NotificationSettingsPage';
import PlansPage from './components/PlansPage/PlansPage';
import { ToastProvider, useToast } from './components/ToastContext';
import api from './services/api';
import { getSocket, closeSocket } from './services/socket';

// Páginas disponíveis na aplicação
const PAGES = {
  LOGIN: 'login',
  REGISTER: 'register',
  WAITING: 'waiting',
  NO_DOMAIN: 'no_domain',
  DEVICES: 'devices',
  DASHBOARD: 'dashboard',
  ADMIN_DEVICES: 'admin_devices',
  ADMIN_DASHBOARD: 'admin_dashboard',
  ADMIN_MEMBERS: 'admin_members',
  ADMIN_SETTINGS: 'admin_settings',
  ADMIN_PLANS: 'admin_plans'
};

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(PAGES.LOGIN);
  const [user, setUser] = useState(null);
  const [domainName, setDomainName] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estatísticas de usuários do domínio (ex.: 3/12)
  const [domainUserCount, setDomainUserCount] = useState(null);
  const [domainUserLimit, setDomainUserLimit] = useState(null);

  // Plano SaaS e estatísticas de dispositivos do domínio
  const [domainPlan, setDomainPlan] = useState('gratuito');
  const [domainDeviceCount, setDomainDeviceCount] = useState(0);
  const [domainDeviceLimit, setDomainDeviceLimit] = useState(3);

  // Dispositivos carregados da API
  const [devices, setDevices] = useState([]);

  // Widgets para dashboard
  const [widgets, setWidgets] = useState([]);

  // Filtro de período do dashboard (compartilhado entre gráficos e CSV)
  const [timeRange, setTimeRange] = useState({ type: 'live', from: null, to: null });

  // Notificações de acesso (admin)
  const [notifications, setNotifications] = useState([]);

  // Lista de todos os usuários (admin)
  const [allUsers, setAllUsers] = useState([]);

  // Dispositivos públicos (para solicitar acesso)
  const [publicDevices, setPublicDevices] = useState([]);

  // Aplica os dados do usuário retornados pela API ao estado local e
  // determina para qual página o usuário deve ser direcionado.
  const applyUserData = useCallback((userData) => {
    setUser({
      id: userData.id,
      username: userData.username,
      email: userData.email,
      domainId: userData.domainId ?? null
    });
    setDomainName(userData.domainName || null);
    setHasAccess(userData.hasAccess);
    setIsAdmin(userData.role === 'admin');
    setDomainUserCount(userData.domainUserCount ?? null);
    setDomainUserLimit(userData.domainUserLimit ?? null);
    setDomainPlan(userData.domainPlan ?? 'gratuito');
    setDomainDeviceLimit(userData.domainMaxDevices ?? 3);

    if (userData.domainId === null && userData.role !== 'admin') {
      return PAGES.NO_DOMAIN;
    }
    if (userData.role === 'admin') {
      return PAGES.ADMIN_DEVICES;
    }
    if (userData.hasAccess) {
      return PAGES.DEVICES;
    }
    return PAGES.WAITING;
  }, []);

  // Recarrega os dados do usuário logado e atualiza a navegação
  const refreshSession = useCallback(async () => {
    const response = await api.auth.me();
    const userData = response.data.user;
    const nextPage = applyUserData(userData);
    setCurrentPage(nextPage);
    return userData;
  }, [applyUserData]);

  // Verificar se há token salvo ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      if (api.auth.isAuthenticated()) {
        try {
          const response = await api.auth.me();
          const userData = response.data.user;
          const nextPage = applyUserData(userData);
          setCurrentPage(nextPage);
          // Inicializar socket após autenticação
          try { getSocket(); } catch (e) { console.warn('Erro ao inicializar socket:', e); }
        } catch (err) {
          console.error('Erro ao verificar autenticação:', err);
          api.auth.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [applyUserData]);

  // Carregar dispositivos quando usuário tiver acesso
  const loadDevices = useCallback(async () => {
    try {
      const response = await api.devices.getAll();
      setDevices(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar dispositivos:', err);
      setError('Erro ao carregar dispositivos');
    }
  }, []);

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
      const [publicResponse, userDevicesResponse] = await Promise.all([
        api.devices.getPublicList(),
        api.devices.getAll()
      ]);
      
      const allPublicDevices = publicResponse.data || [];
      const userDeviceIds = (userDevicesResponse.data || []).map(d => d.id);
      
      // Filtrar apenas dispositivos que o usuário NÃO tem acesso
      const availableDevices = allPublicDevices.filter(d => !userDeviceIds.includes(d.id));
      
      setPublicDevices(availableDevices);
    } catch (err) {
      console.error('Erro ao carregar dispositivos públicos:', err);
    }
  }, [isAdmin]);

  // Carrega a contagem de dispositivos do domínio (para exibir no header)
  const loadDomainDeviceCount = useCallback(async () => {
    try {
      const response = await api.domains.getAll();
      const domainData = response.data?.[0];
      if (domainData) {
        setDomainDeviceCount(domainData.deviceCount ?? 0);
        setDomainPlan(domainData.plan ?? 'gratuito');
        setDomainDeviceLimit(domainData.maxDevices ?? 3);
      }
    } catch (err) {
      console.error('Erro ao carregar info do domínio:', err);
    }
  }, []);

  useEffect(() => {
    if (user && (hasAccess || isAdmin)) {
      loadDevices();
    }
    if (user && isAdmin) {
      loadNotifications();
      loadUsers();
      loadDomainDeviceCount();
    }
    if (user && !isAdmin) {
      loadPublicDevices();
    }
  }, [user, hasAccess, isAdmin, loadDevices, loadNotifications, loadUsers, loadPublicDevices, loadDomainDeviceCount]);



  // Carregar widgets quando dispositivo selecionado
  const loadWidgets = useCallback(async () => {
    if (!selectedDevice) return;
    
    try {
      const response = await api.widgets.getByDevice(selectedDevice.id);
      setWidgets(response.data || []);
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
      const response = await api.auth.login(credentials.email, credentials.password, credentials.domainCode || '');
      const userData = response.data.user;
      const nextPage = applyUserData(userData);

      // Mostrar toast de sucesso
      toast.success('Login realizado com sucesso!');

      setCurrentPage(nextPage);
      // Inicializar socket após login
      try { getSocket(); } catch (e) { console.warn('Erro ao inicializar socket:', e); }
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Erro ao fazer login');
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
        {
          isManager: formData.isManager || false,
          domainName: formData.domainName || '',
          domainCode: formData.domainCode || '',
          requestedDevices: formData.requestedDevices || []
        }
      );
      
      // Após cadastro, remove o token (não faz login automático)
      api.auth.logout();
      
      // Mostra mensagem de sucesso e volta para login
      const msg = formData.isManager
        ? 'Domínio criado e conta de gerente registrada! Faça login para continuar.'
        : formData.requestedDevices?.length > 0
          ? 'Conta criada! Sua solicitação de acesso aos dispositivos foi enviada para aprovação.'
          : 'Conta criada com sucesso! Faça login para continuar.';

      toast.success(msg, 6000);
      setCurrentPage(PAGES.LOGIN);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Erro ao criar conta');
    }
  };

  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    setTimeRange({ type: 'live', from: null, to: null });
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
    try { closeSocket(); } catch (e) {}
    setUser(null);
    setDomainName(null);
    setHasAccess(false);
    setIsAdmin(false);
    setDomainUserCount(null);
    setDomainUserLimit(null);
    setDomainPlan('gratuito');
    setDomainDeviceCount(0);
    setDomainDeviceLimit(3);
    setSelectedDevice(null);
    setDevices([]);
    setWidgets([]);
    setNotifications([]);
    setCurrentPage(PAGES.LOGIN);
    console.log('Logout concluído, página:', PAGES.LOGIN);
  };

  // Navegação para a página de membros do domínio (admin)
  const handleNavigateToMembers = () => {
    setCurrentPage(PAGES.ADMIN_MEMBERS);
  };

  // Navegação para a página de configurações de notificações (admin)
  const handleNavigateToSettings = () => {
    setCurrentPage(PAGES.ADMIN_SETTINGS);
  };

  // Usuário órfão solicita acesso a um domínio existente
  const handleJoinDomain = async (domainCode, requestedDevices) => {
    await api.auth.joinDomain(domainCode, requestedDevices);
    await refreshSession();
  };

  // Usuário órfão cria seu próprio domínio
  const handleCreateDomain = async (domainName, domainCode) => {
    await api.auth.createDomain(domainName, domainCode);
    await refreshSession();
  };

  // Handler chamado após editar perfil com sucesso
  const handleUserSaved = (updatedUser) => {
    setUser(prev => ({
      ...prev,
      username: updatedUser.username || prev.username,
      email:    updatedUser.email    || prev.email
    }));
  };

  // Handler chamado após editar domínio com sucesso
  const handleDomainSaved = (updatedDomain) => {
    if (updatedDomain?.name) setDomainName(updatedDomain.name);
  };

  // Handlers para notificações de acesso
  const handleAcceptUser = async (notification) => {
    try {
      await api.access.approve(notification.id);
      toast.success('Acesso aprovado com sucesso!');
      // Recarregar notificações e dispositivos
      loadNotifications();
      loadDevices();
      loadPublicDevices();
    } catch (err) {
      console.error('Erro ao aprovar acesso:', err);
      toast.error('Erro ao aprovar acesso');
    }
  };

  const handleRejectUser = async (notification) => {
    try {
      await api.access.reject(notification.id);
      toast.success('Acesso rejeitado');
      // Recarregar notificações
      loadNotifications();
    } catch (err) {
      console.error('Erro ao rejeitar acesso:', err);
      toast.error('Erro ao rejeitar acesso');
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
      let response;
      if (timeRange.type === 'today') {
        response = await api.mqtt.getTodayData(selectedDevice.id);
      } else if (timeRange.type === '7days') {
        response = await api.mqtt.getWeekData(selectedDevice.id);
      } else if (timeRange.type === 'custom' && timeRange.from && timeRange.to) {
        const from = new Date(timeRange.from + 'T00:00:00-03:00').toISOString();
        const to   = new Date(timeRange.to   + 'T23:59:59-03:00').toISOString();
        response = await api.mqtt.getDataByRange(selectedDevice.id, from, to);
      } else {
        // modo live: exporta últimos 7 dias
        response = await api.mqtt.getWeekData(selectedDevice.id);
      }

      if (response.data && response.data.length > 0) {
        const csvContent = convertToCSV(response.data);
        downloadCSV(csvContent, `${selectedDevice.name}_${chartType}.csv`);
        toast.success('Dados baixados com sucesso!');
      } else {
        toast.warning('Nenhum dado no período selecionado');
      }
    } catch (err) {
      console.error('Erro ao baixar dados:', err);
      toast.error('Erro ao baixar dados');
    }
  };

  // Helper para converter dados para CSV
  const convertToCSV = (data) => {
    if (!data.length) return '';
    
    console.log('Convertendo dados:', data.length, 'registros');
    console.log('Estrutura do primeiro registro:', data[0]);
    
    // Expandir o campo 'payload' (JSON) para colunas separadas
    const allDataKeys = new Set();
    const excludedKeys = ['Data', 'Hora', 'Timestamp', 'data', 'hora', 'timestamp']; // Excluir campos de data/hora que já estão nas colunas principais
    
    data.forEach(row => {
      const payloadField = row.payload || row.data;
      if (payloadField) {
        try {
          let parsed = payloadField;
          // Se for string, parsear
          if (typeof payloadField === 'string') {
            parsed = JSON.parse(payloadField);
          }
          // Adicionar todas as chaves exceto as de data/hora
          Object.keys(parsed).forEach(key => {
            if (!excludedKeys.includes(key)) {
              allDataKeys.add(key);
            }
          });
        } catch (e) {
          console.error('Erro ao parsear payload:', e, payloadField);
        }
      }
    });
    
    console.log('Campos encontrados no payload:', Array.from(allDataKeys));
    
    // Usar ponto-e-vírgula como separador (padrão brasileiro)
    const separator = ';';
    
    // Cabeçalhos: Data, Hora, Timestamp + campos do payload MQTT
    const headers = ['Data', 'Hora', 'Timestamp', ...Array.from(allDataKeys)];
    
    const rows = data.map(row => {
      // Usar Data e Hora que já vêm formatados do backend
      const dataFormatada = row.Data || '';
      const horaFormatada = row.Hora || '';
      
      // Formatar timestamp como data/hora completa em formato brasileiro
      const timestamp = row.timestamp || row.receivedAt || '';
      let timestampFormatado = '';
      if (timestamp) {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          timestampFormatado = `${dataFormatada} ${horaFormatada}`;
        }
      }
      
      // Parsear o campo 'payload' ou 'data'
      let parsedData = {};
      const payloadField = row.payload || row.data;
      if (payloadField) {
        try {
          // Se já for objeto, usar direto
          if (typeof payloadField === 'object') {
            parsedData = payloadField;
          } else if (typeof payloadField === 'string') {
            parsedData = JSON.parse(payloadField);
          }
        } catch (e) {
          parsedData = {};
        }
      }
      
      // Criar linha com cada campo em sua coluna
      const values = [
        dataFormatada,
        horaFormatada,
        timestampFormatado,
        ...Array.from(allDataKeys).map(key => {
          const value = parsedData[key];
          return value !== undefined && value !== null ? value : '';
        })
      ];
      
      return values.join(separator);
    });
    
    console.log('CSV Headers:', headers);
    console.log('Primeira linha de dados:', rows[0]);
    
    return [headers.join(separator), ...rows].join('\n');
  };

  // Helper para download de CSV
  const downloadCSV = (content, filename) => {
    // Adicionar BOM UTF-8 para Excel reconhecer corretamente
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
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
      loadDomainDeviceCount();
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
      loadDomainDeviceCount();
      toast.success('Dispositivo excluído com sucesso!');
      
      if (selectedDevice?.id === device.id) {
        setSelectedDevice(null);
        setCurrentPage(PAGES.ADMIN_DEVICES);
      }
    } catch (err) {
      console.error('Erro ao excluir dispositivo:', err);
      toast.error('Erro ao excluir dispositivo');
    }
  };

  // Verificar acesso periodicamente (polling)
  useEffect(() => {
    if (!user || hasAccess || isAdmin || currentPage === PAGES.NO_DOMAIN) return;

    // Polling para verificar acesso (a cada 10 segundos)
    const checkAccess = async () => {
      try {
        // MT-04: verifica perfil E dispositivos atribuídos em paralelo
        const [meResponse, devicesResponse] = await Promise.all([
          api.auth.me(),
          api.devices.getAll()
        ]);

        const serverUser = meResponse.data.user;
        const assignedDevices = devicesResponse.data || [];
        const hasAnyDevice = assignedDevices.length > 0;

        if ((serverUser.hasAccess || hasAnyDevice) && !hasAccess) {
          setHasAccess(true);
          setDevices(assignedDevices); // seta diretamente para não depender do timing de setState
          loadPublicDevices();
          setCurrentPage(PAGES.DEVICES);
        }
      } catch (err) {
        console.error('Erro ao verificar acesso:', err);
      }
    };

    const interval = setInterval(checkAccess, 10000); // A cada 10 segundos
    
    return () => {
      clearInterval(interval);
    };
  }, [user, hasAccess, isAdmin, currentPage, loadPublicDevices]);

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

      case PAGES.NO_DOMAIN:
        return (
          <NoDomainPage
            username={user?.username}
            onLogout={handleLogout}
            onJoinDomain={handleJoinDomain}
            onCreateDomain={handleCreateDomain}
          />
        );

      case PAGES.DEVICES:
        return (
          <DevicesPage
            username={user?.username}
            domainName={domainName}
            domainUserCount={domainUserCount}
            domainUserLimit={domainUserLimit}
            domainPlan={domainPlan}
            devices={devices}
            onDeviceClick={handleDeviceClick}
            onLogout={handleLogout}
            onLogoClick={handleLogoClick}
            availableDevices={publicDevices}
            onRequestAccess={handleRequestAccess}
            user={user}
            onUserSaved={handleUserSaved}
          />
        );

      case PAGES.DASHBOARD:
        return (
          <DashboardPage
            username={user?.username}
            domainName={domainName}
            domainUserCount={domainUserCount}
            domainUserLimit={domainUserLimit}
            domainPlan={domainPlan}
            deviceName={selectedDevice?.name}
            device={selectedDevice}
            widgets={widgets}
            onDownloadExcel={handleDownloadExcel}
            onBackToDevices={handleBackToDevices}
            onLogout={handleLogout}
            user={user}
            onUserSaved={handleUserSaved}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        );

      case PAGES.ADMIN_DEVICES:
        return (
          <AdminDevicesPage
            username={user?.username}
            domainName={domainName}
            domainUserCount={domainUserCount}
            domainUserLimit={domainUserLimit}
            domainPlan={domainPlan}
            domainDeviceCount={domainDeviceCount}
            domainDeviceLimit={domainDeviceLimit}
            devices={devices}
            setDevices={setDevices}
            onDeviceClick={handleDeviceClick}
            onAddDevice={handleAddDevice}
            onEditDevice={handleEditDevice}
            onDeleteDevice={handleDeleteDevice}
            onNavigateToDashboard={() => setCurrentPage(PAGES.ADMIN_DASHBOARD)}
            onNavigateToMembers={handleNavigateToMembers}
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToPlans={() => setCurrentPage(PAGES.ADMIN_PLANS)}
            onPlanSelected={async (plan) => {
              await api.domains.updatePlan(user.domainId, plan);
              await refreshSession();
              await loadDomainDeviceCount();
            }}
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
            user={user}
            onUserSaved={handleUserSaved}
            onDomainSaved={handleDomainSaved}
          />
        );

      case PAGES.ADMIN_DASHBOARD:
        return (
          <AdminDashboardPage
            username={user?.username}
            domainName={domainName}
            domainUserCount={domainUserCount}
            domainUserLimit={domainUserLimit}
            domainPlan={domainPlan}
            domainDeviceCount={domainDeviceCount}
            domainDeviceLimit={domainDeviceLimit}
            deviceName={selectedDevice?.name}
            device={selectedDevice}
            widgets={widgets}
            setWidgets={setWidgets}
            onDownloadExcel={handleDownloadExcel}
            onBackToDevices={handleBackToDevices}
            onNavigateToMembers={handleNavigateToMembers}
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToPlans={() => setCurrentPage(PAGES.ADMIN_PLANS)}
            onLogout={handleLogout}
            onRefreshWidgets={loadWidgets}
            notifications={notifications}
            onAcceptUser={handleAcceptUser}
            onRejectUser={handleRejectUser}
            user={user}
            onUserSaved={handleUserSaved}
            onDomainSaved={handleDomainSaved}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        );

      case PAGES.ADMIN_SETTINGS:
        return (
          <NotificationSettingsPage
            username={user?.username}
            domainName={domainName}
            domainUserCount={domainUserCount}
            domainUserLimit={domainUserLimit}
            domainPlan={domainPlan}
            domainDeviceCount={domainDeviceCount}
            domainDeviceLimit={domainDeviceLimit}
            user={user}
            onUserSaved={handleUserSaved}
            onDomainSaved={handleDomainSaved}
            onLogout={handleLogout}
            onBackToDevices={() => setCurrentPage(PAGES.ADMIN_DEVICES)}
            onNavigateToPlans={() => setCurrentPage(PAGES.ADMIN_PLANS)}
          />
        );

      case PAGES.ADMIN_MEMBERS:
        return (
          <MembersPage
            username={user?.username}
            domainName={domainName}
            domainUserCount={domainUserCount}
            domainUserLimit={domainUserLimit}
            domainPlan={domainPlan}
            domainDeviceCount={domainDeviceCount}
            domainDeviceLimit={domainDeviceLimit}
            user={user}
            onUserSaved={handleUserSaved}
            onDomainSaved={handleDomainSaved}
            onLogout={handleLogout}
            onBackToDevices={() => setCurrentPage(PAGES.ADMIN_DEVICES)}
            onRefreshSession={refreshSession}
            onNavigateToPlans={() => setCurrentPage(PAGES.ADMIN_PLANS)}
          />
        );

      case PAGES.ADMIN_PLANS:
        return (
          <PlansPage
            domainId={user?.domainId}
            currentPlan={domainPlan}
            onPlanSelected={async (plan) => {
              await api.domains.updatePlan(user.domainId, plan);
              await refreshSession();
              await loadDomainDeviceCount();
              setCurrentPage(PAGES.ADMIN_DEVICES);
              toast.success('Plano atualizado com sucesso!');
            }}
            onClose={() => setCurrentPage(PAGES.ADMIN_DEVICES)}
            username={user?.username}
            domainName={domainName}
            domainUserCount={domainUserCount}
            domainUserLimit={domainUserLimit}
            domainDeviceCount={domainDeviceCount}
            domainDeviceLimit={domainDeviceLimit}
            onLogout={handleLogout}
            user={user}
            onUserSaved={handleUserSaved}
            onDomainSaved={handleDomainSaved}
            onNavigateToPlans={() => setCurrentPage(PAGES.ADMIN_PLANS)}
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
