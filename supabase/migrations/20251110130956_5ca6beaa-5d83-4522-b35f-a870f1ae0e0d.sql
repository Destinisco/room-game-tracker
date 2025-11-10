-- Add layout_config column to analysis_templates table
ALTER TABLE analysis_templates 
ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT NULL;

COMMENT ON COLUMN analysis_templates.layout_config IS 'Custom layout configuration for PDF text positioning (overrides default layout.json)';