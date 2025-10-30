-- Create enum for template/brief status
CREATE TYPE template_status AS ENUM ('draft', 'published');

-- Game templates table for PDF layout and styling
CREATE TABLE public.game_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  accent_color TEXT NOT NULL DEFAULT '#3b82f6',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  logo_url TEXT,
  background_url TEXT,
  placeholders_schema JSONB NOT NULL DEFAULT '{"required": []}'::jsonb,
  layout_definition JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  status template_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Game AI briefs table for AI analysis configuration
CREATE TABLE public.game_ai_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  output_schema JSONB NOT NULL DEFAULT '{"required": []}'::jsonb,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  version INTEGER NOT NULL DEFAULT 1,
  status template_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Player analyses table to store AI results and PDF URLs
CREATE TABLE public.player_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  ai_version INTEGER NOT NULL,
  template_version INTEGER NOT NULL,
  ai_output_json JSONB,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id)
);

-- Enable RLS
ALTER TABLE public.game_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_ai_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_templates
CREATE POLICY "Admins can manage all templates"
ON public.game_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can view templates"
ON public.game_templates FOR SELECT
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for game_ai_briefs
CREATE POLICY "Admins can manage all briefs"
ON public.game_ai_briefs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can view briefs"
ON public.game_ai_briefs FOR SELECT
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for player_analyses
CREATE POLICY "Admins and editors can view analyses"
ON public.player_analyses FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can insert analyses"
ON public.player_analyses FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update analyses"
ON public.player_analyses FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_game_templates_updated_at
BEFORE UPDATE ON public.game_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_game_ai_briefs_updated_at
BEFORE UPDATE ON public.game_ai_briefs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_player_analyses_updated_at
BEFORE UPDATE ON public.player_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('player-pdfs', 'player-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for player-pdfs bucket
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'player-pdfs' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
);

CREATE POLICY "Public can view PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-pdfs');

CREATE POLICY "Authenticated users can update their PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'player-pdfs' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
);

-- Create default template and brief for existing rooms
INSERT INTO public.game_templates (room_id, name, accent_color, font_family, placeholders_schema, layout_definition, status)
SELECT 
  id,
  'Výchozí šablona Důvěra',
  '#3b82f6',
  'Inter',
  '{"required": ["faithText", "flaw1_name", "flaw1_text", "strength1_text", "strength2_text", "feature1_text", "feature2_text", "teamTips", "role", "color", "code"]}'::jsonb,
  '[
    {"key": "code", "heading": "S", "size": "text-sm", "align": "right", "order": 1},
    {"key": "role", "heading": "M", "size": "text-2xl", "align": "center", "order": 2},
    {"key": "color", "heading": "S", "size": "text-sm", "align": "center", "order": 3},
    {"key": "faithText", "heading": "L", "size": "text-xl", "align": "left", "order": 4},
    {"key": "flaw1_name", "heading": "M", "size": "text-lg", "align": "left", "order": 5},
    {"key": "flaw1_text", "heading": "S", "size": "text-base", "align": "left", "order": 6},
    {"key": "strength1_text", "heading": "M", "size": "text-base", "align": "left", "order": 7},
    {"key": "strength2_text", "heading": "M", "size": "text-base", "align": "left", "order": 8},
    {"key": "feature1_text", "heading": "S", "size": "text-sm", "align": "left", "order": 9},
    {"key": "feature2_text", "heading": "S", "size": "text-sm", "align": "left", "order": 10},
    {"key": "teamTips", "heading": "L", "size": "text-base", "align": "left", "order": 11}
  ]'::jsonb,
  'published'
FROM public.rooms
ON CONFLICT DO NOTHING;

INSERT INTO public.game_ai_briefs (room_id, system_prompt, user_prompt_template, output_schema, model, temperature, max_tokens, status)
SELECT 
  id,
  'Jsi analytik Destinisco Nexus™. Téma hry: Důvěra – spolupráce, komunikace a rozhodování pod tlakem. Piš česky, věcně, s krátkými odstavci. Nedávej diagnózy, buď férový a praktický, hráče má analýza především potěšit a výstupy mají být solidní a příjemné ale upřímné. Hráči by se v tom výstupu měli najít.',
  '[Data hráče a pozorování]
{{json player}}

[Úkol]
Vrať čistý JSON s klíči: {{json required_keys}}.
Vyplň:
- faithText: 1–2 věty shrnutí průběhu a esence projevu hráče.
- flaw1_name, flaw1_text: hlavní slabina (stručný název + 2–3 věty, věcně).
- strength1_text, strength2_text: 2 silné stránky (každá 1–2 věty).
- feature1_text, feature2_text: další relevantní rysy (krátké).
- teamTips: 2–3 věty doporučení pro týmovou práci.
- role, color, code přebírej z dat (bez úprav).
Vrať pouze JSON, bez komentářů.',
  '{"required": ["faithText", "flaw1_name", "flaw1_text", "strength1_text", "strength2_text", "feature1_text", "feature2_text", "teamTips", "role", "color", "code"]}'::jsonb,
  'google/gemini-2.5-flash',
  0.7,
  2000,
  'published'
FROM public.rooms
ON CONFLICT DO NOTHING;