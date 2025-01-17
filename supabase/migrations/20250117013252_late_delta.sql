-- Add favicon_url column to system_settings
ALTER TABLE system_settings
  ADD COLUMN favicon_url text NOT NULL DEFAULT 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=32';

-- Update existing row with default favicon
UPDATE system_settings 
SET favicon_url = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=32'
WHERE id = 1;