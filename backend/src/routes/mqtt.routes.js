const express = require('express');
const router = express.Router();
const mqttController = require('../controllers/mqtt.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * @swagger
 * /api/mqtt/status:
 *   get:
 *     tags: [MQTT]
 *     summary: Status das conexões MQTT
 *     description: Retorna o status das conexões MQTT dos dispositivos do domínio do usuário autenticado.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Status das conexões retornado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 connections:
 *                   type: object
 *                   description: Mapa de deviceId para informações de conexão.
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       connected:
 *                         type: boolean
 *                         example: true
 *                       topic:
 *                         type: string
 *                         example: sensors/esp32/01
 *                   example:
 *                     "1":
 *                       connected: true
 *                       topic: sensors/esp32/01
 *                     "2":
 *                       connected: false
 *                       topic: sensors/esp32/02
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/status', mqttController.getStatus);

/**
 * @swagger
 * /api/mqtt/connect-all:
 *   post:
 *     tags: [MQTT]
 *     summary: Conectar todos os dispositivos ao MQTT
 *     description: Requer role admin. Inicia a conexão MQTT para todos os dispositivos do domínio do admin autenticado.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Conexões iniciadas com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 3 dispositivo(s) sendo conectado(s)
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/connect-all', requireAdmin, mqttController.connectAll);

/**
 * @swagger
 * /api/mqtt/{id}/connect:
 *   post:
 *     tags: [MQTT]
 *     summary: Conectar dispositivo ao MQTT
 *     description: Requer role admin. Inicia a conexão MQTT para um dispositivo específico do domínio.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo a conectar.
 *         example: 1
 *     responses:
 *       200:
 *         description: Conexão iniciada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Conectando ao dispositivo Sensor Sala 01...
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou dispositivo pertence a outro domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Dispositivo não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/connect', requireAdmin, mqttController.connect);

/**
 * @swagger
 * /api/mqtt/{id}/disconnect:
 *   post:
 *     tags: [MQTT]
 *     summary: Desconectar dispositivo do MQTT
 *     description: Requer role admin. Encerra a conexão MQTT de um dispositivo específico do domínio.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo a desconectar.
 *         example: 1
 *     responses:
 *       200:
 *         description: Dispositivo desconectado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Dispositivo desconectado
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuário não possui role admin ou dispositivo pertence a outro domínio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Dispositivo não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/disconnect', requireAdmin, mqttController.disconnect);

/**
 * @swagger
 * /api/mqtt/{id}/data:
 *   get:
 *     tags: [MQTT]
 *     summary: Dados históricos de um dispositivo
 *     description: |
 *       Retorna os dados recebidos via MQTT de um dispositivo. Admite diferentes modos de consulta via query params:
 *       - **Período (`period`):** `today` (dados do dia atual), `day` (últimas 24h), `week` (últimos 7 dias).
 *       - **Intervalo (`from` + `to`):** retorna dados entre as datas ISO 8601 informadas (máx. 10.000 registros).
 *       - **Padrão (sem parâmetros):** retorna os últimos `limit` registros (padrão: 100).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo.
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de registros (usado quando `period` e `from/to` são omitidos).
 *         example: 50
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [today, day, week]
 *         description: Período pré-definido de dados.
 *         example: today
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Início do intervalo (ISO 8601). Usar em conjunto com `to`.
 *         example: "2025-03-01T00:00:00Z"
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fim do intervalo (ISO 8601). Usar em conjunto com `from`.
 *         example: "2025-03-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Dados históricos retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 50
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MqttData'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Dispositivo pertence a outro domínio ou usuário sem acesso ao dispositivo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Dispositivo não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/data', mqttController.getData);

/**
 * @swagger
 * /api/mqtt/{id}/latest:
 *   get:
 *     tags: [MQTT]
 *     summary: Último dado recebido de um dispositivo
 *     description: |
 *       Retorna o payload mais recente recebido via MQTT para o dispositivo.
 *       Tenta o cache em memória primeiro; se vazio, consulta o banco de dados.
 *       Retorna `data: null` se nenhum dado estiver disponível.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo.
 *         example: 1
 *     responses:
 *       200:
 *         description: Último dado retornado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   nullable: true
 *                   oneOf:
 *                     - type: object
 *                       properties:
 *                         payload:
 *                           type: object
 *                           description: Dados do sensor.
 *                           example:
 *                             temperature: 23.5
 *                             humidity: 60.1
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-03-15T14:30:00.000Z"
 *                     - type: "null"
 *                 message:
 *                   type: string
 *                   description: Presente apenas quando `data` é null.
 *                   example: Nenhum dado disponível
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Dispositivo pertence a outro domínio ou usuário sem acesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Dispositivo não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/latest', mqttController.getLatest);

/**
 * @swagger
 * /api/mqtt/{id}/exceedances:
 *   get:
 *     tags: [MQTT]
 *     summary: Dados com excedência de thresholds
 *     description: |
 *       Retorna registros históricos onde os valores dos campos ultrapassaram os limites informados.
 *       Os thresholds são passados via query params no formato `{field}Min` e `{field}Max`.
 *       Exemplo: `?temperatureMin=15&temperatureMax=30&humidityMax=80`
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo.
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de registros.
 *         example: 100
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Início do intervalo de busca (ISO 8601).
 *         example: "2025-03-01T00:00:00Z"
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fim do intervalo de busca (ISO 8601).
 *         example: "2025-03-31T23:59:59Z"
 *       - in: query
 *         name: temperatureMin
 *         required: false
 *         schema:
 *           type: number
 *         description: Valor mínimo aceitável para o campo `temperature`.
 *         example: 15
 *       - in: query
 *         name: temperatureMax
 *         required: false
 *         schema:
 *           type: number
 *         description: Valor máximo aceitável para o campo `temperature`.
 *         example: 30
 *     responses:
 *       200:
 *         description: Registros com excedência retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 12
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MqttData'
 *                 thresholds:
 *                   type: object
 *                   description: Thresholds extraídos dos query params.
 *                   example:
 *                     temperature:
 *                       min: "15"
 *                       max: "30"
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Dispositivo pertence a outro domínio ou usuário sem acesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Dispositivo não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/exceedances', mqttController.getExceedances);

/**
 * @swagger
 * /api/mqtt/{id}/rejected:
 *   get:
 *     tags: [MQTT]
 *     summary: Payloads rejeitados pela validação
 *     description: Retorna os últimos payloads que foram rejeitados pela validação Zod do schema MQTT (armazenados em buffer de memória). Útil para diagnóstico de erros de formato nos dados enviados pelo dispositivo.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do dispositivo.
 *         example: 1
 *     responses:
 *       200:
 *         description: Payloads rejeitados retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       raw:
 *                         type: string
 *                         description: Payload bruto recebido.
 *                         example: '{"temp": "vinte e três"}'
 *                       error:
 *                         type: string
 *                         description: Motivo da rejeição.
 *                         example: Campo "temperature" deve ser um número
 *                       receivedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-03-15T14:30:00.000Z"
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Dispositivo pertence a outro domínio ou usuário sem acesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Dispositivo não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/rejected', mqttController.getRejected);

module.exports = router;
