-- Rozšíření tabulky rooms o nová pole
ALTER TABLE public.rooms 
ADD COLUMN ai_brief TEXT,
ADD COLUMN behavior_lexicon JSONB DEFAULT '{}'::jsonb;

-- Vytvoření tabulky analysis_templates
CREATE TABLE public.analysis_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slots_json TEXT NOT NULL,
  background_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analysis_templates ENABLE ROW LEVEL SECURITY;

-- RLS políčka pro analysis_templates
CREATE POLICY "Allow all access to analysis_templates"
ON public.analysis_templates
FOR ALL
USING (true)
WITH CHECK (true);

-- Rozšíření behavior_items o psychologický popis
ALTER TABLE public.behavior_items
ADD COLUMN psychological_meaning TEXT;

-- Trigger pro automatickou aktualizaci updated_at
CREATE TRIGGER update_analysis_templates_updated_at
BEFORE UPDATE ON public.analysis_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index pro rychlejší vyhledávání šablon podle místnosti
CREATE INDEX idx_analysis_templates_room_id ON public.analysis_templates(room_id);