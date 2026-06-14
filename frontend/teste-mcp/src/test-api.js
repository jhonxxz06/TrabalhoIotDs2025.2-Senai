import axios from 'axios';

const API_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Testar health check
async function testHealthCheck() {
  try {
    console.log('1️⃣ Testing Health Check...');
    const response = await api.get('/api/health');
    console.log('✅ Health check successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

// Testar registro
async function testRegister() {
  try {
    console.log('\n2️⃣ Testing User Registration...');
    const userData = {
      username: `TestUser${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      password: 'Test@123456'
    };
    
    const response = await api.post('/api/auth/register', userData);
    console.log('✅ Registration successful:', response.data);
    
    return response.data.data.token;
  } catch (error) {
    console.error('❌ Registration failed:', error.response?.data || error.message);
    return null;
  }
}

// Testar login
async function testLogin() {
  try {
    console.log('\n3️⃣ Testing User Login...');
    const loginData = {
      email: 'admin@teste.com',
      password: 'admin123',
      domainCode: 'SenaiLauro123'
    };
    
    const response = await api.post('/api/auth/login', loginData);
    console.log('✅ Login successful:', response.data);
    
    return response.data.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return null;
  }
}

// Testar listar usuários (protected)
async function testGetUsers(token) {
  try {
    console.log('\n4️⃣ Testing Get Users (protected route)...');
    
    const response = await api.get('/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Get users successful:', response.data);
  } catch (error) {
    console.error('❌ Get users failed:', error.response?.data || error.message);
  }
}

// Executar todos os testes
async function runAllTests() {
  const health = await testHealthCheck();
  if (!health) {
    console.log('\n❌ Server not responding. Exiting...');
    process.exit(1);
  }
  
  const token = await testRegister();
  const adminToken = await testLogin();
  
  if (adminToken) {
    await testGetUsers(adminToken);
  }
  
  console.log('\n✨ All tests completed!');
}

runAllTests().catch(console.error);
