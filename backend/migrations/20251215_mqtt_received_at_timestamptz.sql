-- Migration: convert mqtt_data.received_at to timestamptz
-- Purpose: Interpret existing TIMESTAMP values as America/Sao_Paulo local time
-- and convert the column to timestamptz so values are stored as UTC instants.

BEGIN;

-- Safety: create a backup column
ALTER TABLE mqtt_data ADD COLUMN received_at_backup TIMESTAMP;
UPDATE mqtt_data SET received_at_backup = received_at;

-- Convert column to timestamptz interpreting existing values as America/Sao_Paulo
ALTER TABLE mqtt_data ALTER COLUMN received_at TYPE TIMESTAMP WITH TIME ZONE
  USING (received_at AT TIME ZONE 'America/Sao_Paulo');

-- Verify data manually before dropping backup
-- If all good, you can drop the backup column:
-- ALTER TABLE mqtt_data DROP COLUMN received_at_backup;

COMMIT;
