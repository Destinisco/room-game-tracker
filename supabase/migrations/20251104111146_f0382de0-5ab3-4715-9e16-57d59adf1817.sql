-- Add updated_at columns to behavior_categories and behavior_items
ALTER TABLE public.behavior_categories 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

ALTER TABLE public.behavior_items 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_behavior_categories_updated_at ON public.behavior_categories;
CREATE TRIGGER update_behavior_categories_updated_at
  BEFORE UPDATE ON public.behavior_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_behavior_items_updated_at ON public.behavior_items;
CREATE TRIGGER update_behavior_items_updated_at
  BEFORE UPDATE ON public.behavior_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();