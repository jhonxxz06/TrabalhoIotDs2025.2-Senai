-- Migration: notificações de excedências via Telegram
-- Adiciona configuração de Telegram por domínio e tabelas de contadores/log de notificações.

BEGIN;

ALTER TABLE domains ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS exceedance_counters (
  id SERIAL PRIMARY KEY,
  widget_id INTEGER NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(widget_id, field_name)
);

CREATE TABLE IF NOT EXISTS notification_log (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL,
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  widget_id INTEGER REFERENCES widgets(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  value_read NUMERIC,
  threshold_value NUMERIC,
  threshold_type TEXT,
  channel TEXT NOT NULL DEFAULT 'telegram',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  message_sent TEXT
);

COMMIT;
