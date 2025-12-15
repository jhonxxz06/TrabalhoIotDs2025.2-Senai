const { run, query, queryOne } = require('../config/database');

const AccessRequest = {
  /**
   * Busca solicitação por ID
   */
  async findById(id) {
    return await queryOne(`
      SELECT ar.*, u.username, u.email, d.name as device_name
      FROM access_requests ar
      LEFT JOIN users u ON ar.user_id = u.id
      LEFT JOIN devices d ON ar.device_id = d.id
      WHERE ar.id = $1
    `, [id]);
  },

  /**
   * Lista todas as solicitações (admin)
   */
  async findAll(status = null) {
    if (status) {
      return await query(`
        SELECT ar.*, u.username, u.email, d.name as device_name
        FROM access_requests ar
        LEFT JOIN users u ON ar.user_id = u.id
        LEFT JOIN devices d ON ar.device_id = d.id
        WHERE ar.status = $1
        ORDER BY ar.created_at DESC
      `, [status]);
    }
    return await query(`
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
  async findByUserId(userId) {
    return await query(`
      SELECT ar.*, d.name as device_name
      FROM access_requests ar
      LEFT JOIN devices d ON ar.device_id = d.id
      WHERE ar.user_id = $1
      ORDER BY ar.created_at DESC
    `, [userId]);
  },

  /**
   * Conta solicitações pendentes (para notificação do admin)
   */
  async countPending() {
    const result = await queryOne('SELECT COUNT(*) as count FROM access_requests WHERE status = $1', ['pending']);
    return result ? result.count : 0;
  },

  /**
   * Verifica se usuário já tem solicitação pendente
   */
  async hasPendingRequest(userId, deviceId = null) {
    if (deviceId) {
      const result = await queryOne(
        'SELECT 1 FROM access_requests WHERE user_id = $1 AND device_id = $2 AND status = $3',
        [userId, deviceId, 'pending']
      );
      return !!result;
    }
    const result = await queryOne(
      'SELECT 1 FROM access_requests WHERE user_id = $1 AND device_id IS NULL AND status = $2',
      [userId, 'pending']
    );
    return !!result;
  },

  /**
   * Cria nova solicitação de acesso
   */
  async create(userId, deviceId = null, message = null) {
    await run(`
      INSERT INTO access_requests (user_id, device_id, message, status)
      VALUES ($1, $2, $3, 'pending')
    `, [userId, deviceId, message]);

    return await queryOne(`
      SELECT ar.*, u.username, u.email, d.name as device_name
      FROM access_requests ar
      LEFT JOIN users u ON ar.user_id = u.id
      LEFT JOIN devices d ON ar.device_id = d.id
      WHERE ar.user_id = $1 AND ar.status = 'pending'
      ORDER BY ar.id DESC LIMIT 1
    `, [userId]);
  },

  /**
   * Atualiza status da solicitação
   */
  async updateStatus(id, status) {
    await run('UPDATE access_requests SET status = $1 WHERE id = $2', [status, id]);
    return await this.findById(id);
  },

  /**
   * Aprova solicitação
   */
  async approve(id) {
    return await this.updateStatus(id, 'approved');
  },

  /**
   * Rejeita solicitação
   */
  async reject(id) {
    return await this.updateStatus(id, 'rejected');
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
