// Rota do webhook do Telegram — montada em /api/telegram (sem prefixo /api/domains)
// Não usa autenticação JWT; a segurança é feita via X-Telegram-Bot-Api-Secret-Token
const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domain.controller');

/**
 * @swagger
 * /api/telegram/webhook:
 *   post:
 *     tags: [Domains]
 *     summary: Webhook do Telegram Bot
 *     description: |
 *       Rota pública protegida por `X-Telegram-Bot-Api-Secret-Token`.
 *       Recebe updates do Telegram Bot API e processa comandos:
 *
 *       - **`/conectar CÓDIGO`** — vincula o grupo ao domínio correspondente ao código de verificação.
 *       - **`/desconectar`** — desvincula o grupo do domínio conectado.
 *
 *       Sempre retorna HTTP 200 para updates válidos (evita reenvio pelo Telegram).
 *       O processamento do update ocorre de forma assíncrona após o retorno do 200.
 *     parameters:
 *       - in: header
 *         name: X-Telegram-Bot-Api-Secret-Token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token secreto configurado no webhook do Telegram para autenticação da requisição.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Objeto de update do Telegram Bot API.
 *             properties:
 *               message:
 *                 type: object
 *                 properties:
 *                   text:
 *                     type: string
 *                     example: /conectar A3F9C1
 *                   chat:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: -1001234567890
 *                       title:
 *                         type: string
 *                         example: Grupo CleanAir
 *     responses:
 *       200:
 *         description: Update recebido com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       403:
 *         description: Token secreto ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/webhook', domainController.handleTelegramWebhook);

module.exports = router;
