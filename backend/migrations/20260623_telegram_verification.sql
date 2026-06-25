-- Colunas para fluxo de verificação por código
-- Permite que o admin conecte o grupo Telegram ao domínio sem precisar do chat_id manual.
ALTER TABLE domains ADD COLUMN IF NOT EXISTS telegram_verification_code VARCHAR(10);
ALTER TABLE domains ADD COLUMN IF NOT EXISTS telegram_verification_expires_at TIMESTAMPTZ;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS telegram_chat_name VARCHAR(255);
