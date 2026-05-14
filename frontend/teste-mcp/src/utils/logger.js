/**
 * logger.js — Utilitário centralizado de logging seguro
 *
 * COMPORTAMENTO:
 *   - Em desenvolvimento (NODE_ENV === 'development'): imprime normalmente no console.
 *   - Em produção (NODE_ENV === 'production'): silencia todos os logs.
 *
 * USO:
 *   import logger from '../utils/logger';
 *   logger.log('mensagem');
 *   logger.warn('aviso');
 *   logger.error('erro', err.message);
 *
 * REGRA: Nunca usar console.log/warn/error diretamente nos arquivos do frontend.
 *        Sempre usar este módulo para garantir o controle de produção.
 */

const isDev = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  error: (...args) => {
    if (isDev) console.error(...args);
  }
};

export default logger;
