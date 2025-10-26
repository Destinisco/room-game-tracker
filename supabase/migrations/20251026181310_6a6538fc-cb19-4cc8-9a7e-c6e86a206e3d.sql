-- Add total_game_time_ms to game_sessions
ALTER TABLE public.game_sessions
ADD COLUMN total_game_time_ms integer DEFAULT 0;