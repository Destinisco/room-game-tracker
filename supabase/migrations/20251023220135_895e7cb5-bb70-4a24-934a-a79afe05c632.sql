-- Create RoleTemplate table
CREATE TABLE public.role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create BehaviorCategory table
CREATE TABLE public.behavior_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create BehaviorItem table
CREATE TABLE public.behavior_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.behavior_categories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_items ENABLE ROW LEVEL SECURITY;

-- Create policies - public access for now
CREATE POLICY "Allow all access to role_templates" ON public.role_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to behavior_categories" ON public.behavior_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to behavior_items" ON public.behavior_items FOR ALL USING (true) WITH CHECK (true);

-- Seed some example data for the existing "Důvěra" room
WITH room AS (SELECT id FROM public.rooms WHERE name = 'Důvěra' LIMIT 1)
INSERT INTO public.role_templates (room_id, name, description)
SELECT 
  room.id,
  role_name,
  role_desc
FROM room,
LATERAL (VALUES
  ('Vůdce', 'Osoba, která přebírá iniciativu a koordinuje tým'),
  ('Technik', 'Zaměřuje se na technické hádanky a mechanismy'),
  ('Komunikátor', 'Sdílí informace a udržuje tým v kontaktu')
) AS roles(role_name, role_desc);

-- Seed behavior categories and items
WITH room AS (SELECT id FROM public.rooms WHERE name = 'Důvěra' LIMIT 1),
category_1 AS (
  INSERT INTO public.behavior_categories (room_id, name)
  SELECT room.id, 'Zapojení do hry'
  FROM room
  RETURNING id
),
category_2 AS (
  INSERT INTO public.behavior_categories (room_id, name)
  SELECT room.id, 'Průzkum a hledačské dovednosti'
  FROM room
  RETURNING id
)
INSERT INTO public.behavior_items (category_id, label)
SELECT category_1.id, 'Komunikuje jasně a srozumitelně'
FROM category_1
UNION ALL
SELECT category_1.id, 'Aktivně naslouchá ostatním'
FROM category_1
UNION ALL
SELECT category_2.id, 'Systematicky prohledává prostor'
FROM category_2
UNION ALL
SELECT category_2.id, 'Všímá si detailů'
FROM category_2;