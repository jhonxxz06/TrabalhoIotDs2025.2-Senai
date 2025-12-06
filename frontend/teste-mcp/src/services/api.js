const API_URL = 'http://localhost:3001/api';

// Helpers
const getToken = () => localStorage.getItem('token');

const headers = (includeAuth = true) => {
  const h = { 'Content-Type': 'application/json' };
  if (includeAuth && getToken()) {
    h['Authorization'] = `Bearer ${getToken()}`;
  }
  return h;
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    // Monta mensagem de erro detalhada
    let errorMessage = data.message || data.error || 'Erro na requisição';
    
    // Se houver detalhes de validação, adiciona à mensagem
    if (data.details && Array.isArray(data.details)) {
      const detailMessages = data.details.map(d => d.message).join('. ');
      errorMessage = detailMessages || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
  return data;
};

// ============================================
// AUTH
// ============================================

export const auth = {
  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(response);
    if (data.data?.token) {
      localStorage.setItem('token', data.data.token);
    }
    return data;
  },

  async register(username, email, password, requestedDevices = []) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify({ username, email, password, requestedDevices })
    });
    const data = await handleResponse(response);
    if (data.data?.token) {
      localStorage.setItem('token', data.data.token);
    }
    return data;
  },

  async me() {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  logout() {
    localStorage.removeItem('token');
  },

  isAuthenticated() {
    return !!getToken();
  }
};

// ============================================
// USERS
// ============================================

export const users = {
  async getAll() {
    const response = await fetch(`${API_URL}/users`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async updateAccess(userId, hasAccess) {
    const response = await fetch(`${API_URL}/users/${userId}/access`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ hasAccess })
    });
    return handleResponse(response);
  }
};

// ============================================
// DEVICES
// ============================================

export const devices = {
  // Lista pública de dispositivos (sem autenticação - para tela de cadastro)
  async getPublicList() {
    const response = await fetch(`${API_URL}/devices/public`, {
      headers: headers(false)
    });
    return handleResponse(response);
  },

  async getAll() {
    const response = await fetch(`${API_URL}/devices`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/devices/${id}`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async create(device) {
    const response = await fetch(`${API_URL}/devices`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(device)
    });
    return handleResponse(response);
  },

  async update(id, device) {
    const response = await fetch(`${API_URL}/devices/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(device)
    });
    return handleResponse(response);
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/devices/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(response);
  },

  async updateUsers(id, userIds) {
    const response = await fetch(`${API_URL}/devices/${id}/users`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ userIds })
    });
    return handleResponse(response);
  }
};

// ============================================
// WIDGETS
// ============================================

export const widgets = {
  async getAll() {
    const response = await fetch(`${API_URL}/widgets`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async getByDevice(deviceId) {
    const response = await fetch(`${API_URL}/widgets/device/${deviceId}`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async create(widget) {
    const response = await fetch(`${API_URL}/widgets`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(widget)
    });
    return handleResponse(response);
  },

  async update(id, widget) {
    const response = await fetch(`${API_URL}/widgets/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(widget)
    });
    return handleResponse(response);
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/widgets/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(response);
  }
};

// ============================================
// ACCESS REQUESTS
// ============================================

export const access = {
  async getAll(status = null) {
    const url = status 
      ? `${API_URL}/access?status=${status}` 
      : `${API_URL}/access`;
    const response = await fetch(url, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async getPending() {
    const response = await fetch(`${API_URL}/access?status=pending`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async countPending() {
    const response = await fetch(`${API_URL}/access/pending/count`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async create(deviceId = null, message = null) {
    const response = await fetch(`${API_URL}/access`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ deviceId, message })
    });
    return handleResponse(response);
  },

  async approve(id) {
    const response = await fetch(`${API_URL}/access/${id}/approve`, {
      method: 'PUT',
      headers: headers()
    });
    return handleResponse(response);
  },

  async reject(id) {
    const response = await fetch(`${API_URL}/access/${id}/reject`, {
      method: 'PUT',
      headers: headers()
    });
    return handleResponse(response);
  }
};

// ============================================
// MQTT
// ============================================

export const mqtt = {
  async getStatus() {
    const response = await fetch(`${API_URL}/mqtt/status`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async connect(deviceId) {
    const response = await fetch(`${API_URL}/mqtt/${deviceId}/connect`, {
      method: 'POST',
      headers: headers()
    });
    return handleResponse(response);
  },

  async disconnect(deviceId) {
    const response = await fetch(`${API_URL}/mqtt/${deviceId}/disconnect`, {
      method: 'POST',
      headers: headers()
    });
    return handleResponse(response);
  },

  async connectAll() {
    const response = await fetch(`${API_URL}/mqtt/connect-all`, {
      method: 'POST',
      headers: headers()
    });
    return handleResponse(response);
  },

  async getLatest(deviceId) {
    const response = await fetch(`${API_URL}/mqtt/${deviceId}/latest`, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async getData(deviceId, options = {}) {
    const { limit = 100, period } = options;
    let url = `${API_URL}/mqtt/${deviceId}/data`;
    
    if (period) {
      url += `?period=${period}`;
    } else {
      url += `?limit=${limit}`;
    }
    
    const response = await fetch(url, {
      headers: headers()
    });
    return handleResponse(response);
  },

  async getDayData(deviceId) {
    return this.getData(deviceId, { period: 'day' });
  },

  async getWeekData(deviceId) {
    return this.getData(deviceId, { period: 'week' });
  }
};

// Export default com todos os serviços
const api = { auth, users, devices, widgets, access, mqtt };
export default api;
