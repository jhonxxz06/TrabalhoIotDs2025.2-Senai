require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./config/swagger');
const { initDatabase } = require('./config/database');
const { verifyToken } = require('./services/token.service');
const User = require('./models/User');
const Device = require('./models/Device');

// Força IPv4 em todas as conexões de saída.
// O Render (PaaS usado em produção) tem suporte parcial/quebrado a IPv6,
// o que causa timeouts no fetch nativo do Node (Happy Eyeballs tenta IPv6 primeiro).
const net = require('net');
const dns = require('dns');
net.setDefaultAutoSelectFamily(false);
dns.setDefaultResultOrder('ipv4first');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Configurar origem(es) permitida(s) para CORS e Socket.IO via variável de ambiente
// Pode ser uma única URL ou várias separadas por vírgula
const rawOrigins = process.env.FRONTEND_ORIGIN || process.env.REACT_APP_API_URL || '';
const FRONTEND_ORIGINS = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

function allowOrigin(origin, callback) {
  // Allow requests with no origin (curl, server-to-server)
  if (!origin) return callback(null, true);
  // If no origins configured, allow all (development)
  if (FRONTEND_ORIGINS.length === 0) return callback(null, true);
  if (FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
  return callback(new Error('CORS not allowed'), false);
}

const corsOptions = {
  origin: allowOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Configurar Socket.IO com CORS (usa mesma lógica)
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => allowOrigin(origin, callback),
    credentials: true
  }
});

// Documentação Swagger UI — montada antes do helmet para evitar conflito de CSP
// (Swagger UI utiliza scripts e estilos inline que seriam bloqueados pelo header CSP padrão)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'CleanAir API Docs',
  swaggerOptions: { persistAuthorization: true }
}));

// Middlewares de segurança e parsing
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors(corsOptions));
app.use(express.json());

// Socket.IO - Gerenciar conexões
io.on('connection', (socket) => {
  console.log(`🔌 Cliente WebSocket conectado: ${socket.id}`);
  
  // Cliente se inscreve em um dispositivo específico
  // Garante que o device pertence ao mesmo domínio do usuário autenticado no socket
  socket.on('subscribe:device', async (deviceId) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        console.log(`[WebSocket] Cliente ${socket.id} sem token - subscrição negada para device:${deviceId}`);
        return;
      }

      const decoded = verifyToken(token);
      const dbUser = await User.findById(decoded.id);
      const device = await Device.findById(deviceId);

      if (!device || !dbUser?.domain_id || device.domain_id !== dbUser.domain_id) {
        console.log(`[WebSocket] Cliente ${socket.id} negado para device:${deviceId} (fora do domínio)`);
        return;
      }

      socket.join(`device:${deviceId}`);
      console.log(`[WebSocket] Cliente ${socket.id} inscrito no device:${deviceId}`);
    } catch (error) {
      console.log(`[WebSocket] Falha na subscrição do cliente ${socket.id}:`, error.message);
    }
  });
  
  socket.on('unsubscribe:device', (deviceId) => {
    socket.leave(`device:${deviceId}`);
    console.log(`[WebSocket] Cliente ${socket.id} desinscrito do device:${deviceId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Cliente WebSocket desconectado: ${socket.id}`);
  });
});

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Rotas da API
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const deviceRoutes = require('./routes/device.routes');
const widgetRoutes = require('./routes/widget.routes');
const accessRoutes = require('./routes/access.routes');
const mqttRoutes = require('./routes/mqtt.routes');
const domainRoutes = require('./routes/domain.routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/mqtt', mqttRoutes);
app.use('/api/domains', domainRoutes);

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor'
  });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada'
  });
});

// Inicializa o banco de dados e depois inicia o servidor
initDatabase()
  .then(() => {
    server.listen(PORT, '0.0.0.0', async () => {
      console.log(` Servidor rodando em http://localhost:${PORT}`);
      const originsDisplay = FRONTEND_ORIGINS.length ? FRONTEND_ORIGINS.join(',') : 'any';
      console.log(` WebSocket pronto na porta ${PORT} (CORS origins: ${originsDisplay})`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
      console.log(` Documentação: http://localhost:${PORT}/api/docs`);
      
      // Inicializa conexões MQTT após servidor estar pronto
      const { initMqttConnections } = require('./config/mqtt');
      setTimeout(async () => {
        await initMqttConnections(io);

        // Carrega contadores de notificação do banco para memória
        const notificationService = require('./services/notification.service');
        await notificationService.init();
      }, 1000);
    });
  })
  .catch((err) => {
    console.error(' Erro ao inicializar banco de dados:', err);
    process.exit(1);
  });
