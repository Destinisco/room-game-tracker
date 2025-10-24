-- Drop existing check constraint on game_sessions.status
ALTER TABLE public.game_sessions DROP CONSTRAINT IF EXISTS game_sessions_status_check;

-- Add new check constraint with pending status
ALTER TABLE public.game_sessions 
ADD CONSTRAINT game_sessions_status_check 
CHECK (status IN ('pending', 'running', 'finished'));

-- Update default
ALTER TABLE public.game_sessions 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  band_color TEXT,
  gender TEXT CHECK (gender IN ('Muž', 'Žena')),
  consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create player_observations table
CREATE TABLE public.player_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'cs' CHECK (language IN ('cs', 'en')),
  primary_role_id UUID REFERENCES public.role_templates(id) ON DELETE SET NULL,
  checks JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_observations ENABLE ROW LEVEL SECURITY;

-- Create policies for players
CREATE POLICY "Allow all access to players"
ON public.players
FOR ALL
USING (true)
WITH CHECK (true);

-- Create policies for player_observations
CREATE POLICY "Allow all access to player_observations"
ON public.player_observations
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for player_observations updated_at
CREATE TRIGGER update_player_observations_updated_at
BEFORE UPDATE ON public.player_observations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
DO $$
DECLARE
  v_room_id UUID;
  v_session_id UUID;
  v_player1_id UUID;
  v_player2_id UUID;
  v_role_id UUID;
BEGIN
  -- Get Důvěra room
  SELECT id INTO v_room_id FROM public.rooms WHERE name = 'Důvěra' LIMIT 1;
  
  IF v_room_id IS NOT NULL THEN
    -- Create a test session
    INSERT INTO public.game_sessions (room_id, code, status, time_limit_minutes, start_time)
    VALUES (v_room_id, '741-' || to_char(now(), 'YYMMDD'), 'pending', 60, now())
    RETURNING id INTO v_session_id;
    
    -- Create first player
    INSERT INTO public.players (session_id, full_name, email, band_color, gender, consent)
    VALUES (v_session_id, 'Filip Kouba', 'filip@example.com', 'Hnědá', 'Muž', true)
    RETURNING id INTO v_player1_id;
    
    -- Create second player
    INSERT INTO public.players (session_id, full_name, email, band_color, gender, consent)
    VALUES (v_session_id, 'Anna Nováková', 'anna@example.com', 'Červená', 'Žena', true)
    RETURNING id INTO v_player2_id;
    
    -- Get sample role
    SELECT id INTO v_role_id FROM public.role_templates WHERE role_templates.room_id = v_room_id LIMIT 1;
    
    -- Create observations
    IF v_role_id IS NOT NULL THEN
      INSERT INTO public.player_observations (player_id, language, primary_role_id, checks, notes)
      VALUES 
        (v_player1_id, 'cs', v_role_id, '{}', 'Je fajn'),
        (v_player2_id, 'cs', NULL, '{}', '');
    ELSE
      INSERT INTO public.player_observations (player_id, language, checks, notes)
      VALUES 
        (v_player1_id, 'cs', '{}', 'Je fajn'),
        (v_player2_id, 'cs', '{}', '');
    END IF;
  END IF;
END $$;