-- Revert migration: convert mqtt_data.received_at (timestamptz) back to timestamp without time zone
-- This will interpret the stored UTC instants as America/Sao_Paulo local wall time and store naive timestamps.
-- WARNING: Review backup columns after running.

BEGIN;

-- Safety backup of current timestamptz values
ALTER TABLE mqtt_data ADD COLUMN received_at_revert_backup TIMESTAMP WITH TIME ZONE;
UPDATE mqtt_data SET received_at_revert_backup = received_at;

-- Convert timestamptz -> timestamp (wall time in America/Sao_Paulo)
ALTER TABLE mqtt_data ALTER COLUMN received_at TYPE TIMESTAMP
  USING (received_at AT TIME ZONE 'America/Sao_Paulo');

COMMIT;

-- After verifying, you may drop the backup columns if desired:
-- ALTER TABLE mqtt_data DROP COLUMN received_at_revert_backup;
-- (If original migration created received_at_backup, you can drop it too when safe.)
