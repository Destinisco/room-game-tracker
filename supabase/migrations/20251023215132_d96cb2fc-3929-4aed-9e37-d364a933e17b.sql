-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  branch TEXT,
  description TEXT,
  band_colors TEXT[] DEFAULT '{}',
  time_limit_minutes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create game_sessions table
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'finished')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  time_limit_minutes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies - public access for now (no auth required in step 1)
CREATE POLICY "Allow all access to rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to game_sessions" ON public.game_sessions FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rooms
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: Add "Důvěra" room with some sessions
INSERT INTO public.rooms (name, branch, description, band_colors, time_limit_minutes)
VALUES (
  'Důvěra',
  'Praha',
  'Úniková místnost zaměřená na týmovou spolupráci a komunikaci',
  ARRAY['Hnědá', 'Modrá', 'Červená', 'Zelená'],
  70
);

-- Insert some game sessions for testing
WITH room AS (SELECT id FROM public.rooms WHERE name = 'Důvěra' LIMIT 1)
INSERT INTO public.game_sessions (room_id, code, status, start_time, time_limit_minutes, created_at)
SELECT 
  room.id,
  (row_number() OVER ())::text || '-' || to_char(current_date - (random() * 30)::int, 'DDMMYY'),
  CASE WHEN random() < 0.3 THEN 'running' ELSE 'finished' END,
  now() - (random() * interval '30 days'),
  70,
  now() - (random() * interval '30 days')
FROM room, generate_series(1, 15);

-- Add one fresh running session
WITH room AS (SELECT id FROM public.rooms WHERE name = 'Důvěra' LIMIT 1)
INSERT INTO public.game_sessions (room_id, code, status, start_time, time_limit_minutes)
SELECT room.id, '388-' || to_char(current_date, 'DDMMYY'), 'running', now() - interval '15 minutes', 70
FROM room;