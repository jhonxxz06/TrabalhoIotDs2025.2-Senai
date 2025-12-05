const { run, query, queryOne } = require('../config/database');

const AccessRequest = {
  /**
   * Busca solicitação por ID
   */
  findById(id) {
    return queryOne(`
      SELECT ar.*, u.username, u.email, d.name as device_name
      FROM access_requests ar
      LEFT JOIN users u ON ar.user_id = u.id
      LEFT JOIN devices d ON ar.device_id = d.id
      WHERE ar.id = ?
    `, [id]);
  },

  /**
   * Lista todas as solicitações (admin)
   */
  findAll(status = null) {
    if (status) {
      return query(`
        SELECT ar.*, u.username, u.email, d.name as device_name
        FROM access_requests ar
        LEFT JOIN users u ON ar.user_id = u.id
        LEFT JOIN devices d ON ar.device_id = d.id
        WHERE ar.status = ?
        ORDER BY ar.created_at DESC
      `, [status]);
    }
    return query(`
      SELECT ar.*, u.username, u.email, d.name as device_name
      FROM access_requests ar
      LEFT JOIN users u ON ar.user_id = u.id
      LEFT JOIN devices d ON ar.device_id = d.id
      ORDER BY ar.created_at DESC
    `);
  },

  /**
   * Lista solicitações de um usuário
   */
  findByUserId(userId) {
    return query(`
      SELECT ar.*, d.name as device_name
      FROM access_requests ar
      LEFT JOIN devices d ON ar.device_id = d.id
      WHERE ar.user_id = ?
      ORDER BY ar.created_at DESC
    `, [userId]);
  },

  /**
   * Conta solicitações pendentes (para notificação do admin)
   */
  countPending() {
    const result = queryOne('SELECT COUNT(*) as count FROM access_requests WHERE status = ?', ['pending']);
    return result ? result.count : 0;
  },

  /**
   * Verifica se usuário já tem solicitação pendente
   */
  hasPendingRequest(userId, deviceId = null) {
    if (deviceId) {
      const result = queryOne(
        'SELECT 1 FROM access_requests WHERE user_id = ? AND device_id = ? AND status = ?',
        [userId, deviceId, 'pending']
      );
      return !!result;
    }
    const result = queryOne(
      'SELECT 1 FROM access_requests WHERE user_id = ? AND device_id IS NULL AND status = ?',
      [userId, 'pending']
    );
    return !!result;
  },

  /**
   * Cria nova solicitação de acesso
   */
  create(userId, deviceId = null, message = null) {
    run(`
      INSERT INTO access_requests (user_id, device_id, message, status)
      VALUES (?, ?, ?, 'pending')
    `, [userId, deviceId, message]);

    return queryOne(`
      SELECT ar.*, u.username, u.email, d.name as device_name
      FROM access_requests ar
      LEFT JOIN users u ON ar.user_id = u.id
      LEFT JOIN devices d ON ar.device_id = d.id
      WHERE ar.user_id = ? AND ar.status = 'pending'
      ORDER BY ar.id DESC LIMIT 1
    `, [userId]);
  },

  /**
   * Atualiza status da solicitação
   */
  updateStatus(id, status) {
    run('UPDATE access_requests SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  },

  /**
   * Aprova solicitação
   */
  approve(id) {
    return this.updateStatus(id, 'approved');
  },

  /**
   * Rejeita solicitação
   */
  reject(id) {
    return this.updateStatus(id, 'rejected');
  },

  /**
   * Converte para formato público
   */
  toPublic(request) {
    if (!request) return null;
    return {
      id: request.id,
      userId: request.user_id,
      username: request.username,
      email: request.email,
      deviceId: request.device_id,
      deviceName: request.device_name,
      message: request.message,
      status: request.status,
      createdAt: request.created_at
    };
  }
};

module.exports = AccessRequest;
