-- Add game control fields to game_sessions
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS paused_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS total_paused_ms integer DEFAULT 0 NOT NULL;

-- First drop the old constraint
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_status_check;

-- Add new constraint with all statuses including old 'pending'
ALTER TABLE game_sessions 
ADD CONSTRAINT game_sessions_status_check 
CHECK (status IN ('not_started', 'running', 'paused', 'finished', 'pending'));

-- Update existing sessions to use new status
UPDATE game_sessions SET status = 'not_started' WHERE status = 'pending';

-- Now drop and recreate constraint without 'pending'
ALTER TABLE game_sessions DROP CONSTRAINT game_sessions_status_check;
ALTER TABLE game_sessions 
ADD CONSTRAINT game_sessions_status_check 
CHECK (status IN ('not_started', 'running', 'paused', 'finished'));

-- Set default status to not_started
ALTER TABLE game_sessions 
ALTER COLUMN status SET DEFAULT 'not_started';

-- Add edit code protection to rooms
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS edit_code text;