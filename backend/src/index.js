require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Configurar Socket.IO com CORS (aceita todas as origens)
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});

// Middlewares de segurança e parsing
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors()); // Aceita qualquer origem
app.use(express.json());

// Socket.IO - Gerenciar conexões
io.on('connection', (socket) => {
  console.log(`🔌 Cliente WebSocket conectado: ${socket.id}`);
  
  // Cliente se inscreve em um dispositivo específico
  socket.on('subscribe:device', (deviceId) => {
    socket.join(`device:${deviceId}`);
    console.log(`[WebSocket] Cliente ${socket.id} inscrito no device:${deviceId}`);
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

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/mqtt', mqttRoutes);

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

// Inicializa o servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🔌 WebSocket pronto na porta ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  
  // Inicializa conexões MQTT após servidor estar pronto
  const { initMqttConnections } = require('./config/mqtt');
  setTimeout(() => {
    initMqttConnections(io);
  }, 1000);
});
