-- Create room_types table
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  pdf_template_component TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_room_types_updated_at 
  BEFORE UPDATE ON room_types 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to room_types" 
  ON room_types 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Add room_type_id to rooms
ALTER TABLE rooms 
  ADD COLUMN room_type_id UUID REFERENCES room_types(id);

-- Add room_type_id to behavior_categories (keep room_id as nullable)
ALTER TABLE behavior_categories 
  ADD COLUMN room_type_id UUID REFERENCES room_types(id);
ALTER TABLE behavior_categories 
  ALTER COLUMN room_id DROP NOT NULL;

-- Add room_type_id to role_templates
ALTER TABLE role_templates 
  ADD COLUMN room_type_id UUID REFERENCES room_types(id);
ALTER TABLE role_templates 
  ALTER COLUMN room_id DROP NOT NULL;

-- Add room_type_id to analysis_templates
ALTER TABLE analysis_templates 
  ADD COLUMN room_type_id UUID REFERENCES room_types(id);
ALTER TABLE analysis_templates 
  ALTER COLUMN room_id DROP NOT NULL;

-- Create default room_type "Důvěra"
INSERT INTO room_types (name, description, pdf_template_component)
VALUES ('Důvěra', 'Základní typ herní místnosti', 'DuvěraTemplate');

-- Assign all rooms to "Důvěra" type
UPDATE rooms 
SET room_type_id = (SELECT id FROM room_types WHERE name = 'Důvěra');

-- Migrate behavior categories to room_type
UPDATE behavior_categories 
SET room_type_id = (
  SELECT room_type_id 
  FROM rooms 
  WHERE rooms.id = behavior_categories.room_id
);

-- Migrate roles to room_type
UPDATE role_templates 
SET room_type_id = (
  SELECT room_type_id 
  FROM rooms 
  WHERE rooms.id = role_templates.room_id
);

-- Migrate analysis templates to room_type
UPDATE analysis_templates 
SET room_type_id = (
  SELECT room_type_id 
  FROM rooms 
  WHERE rooms.id = analysis_templates.room_id
);