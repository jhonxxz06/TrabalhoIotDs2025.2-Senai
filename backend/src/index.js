require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança e parsing
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());

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

// Inicializa o banco de dados e depois inicia o servidor
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
      
      // Inicializa conexões MQTT após servidor estar pronto
      const { initMqttConnections } = require('./config/mqtt');
      setTimeout(() => {
        initMqttConnections();
      }, 1000);
    });
  })
  .catch((err) => {
    console.error('❌ Erro ao inicializar banco de dados:', err);
    process.exit(1);
  });
