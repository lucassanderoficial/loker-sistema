-- Create system settings table
CREATE TABLE system_settings (
  id integer PRIMARY KEY CHECK (id = 1), -- Ensure only one row
  system_name text NOT NULL DEFAULT 'Loker',
  logo_url text,
  primary_color text NOT NULL DEFAULT '#2563eb',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "system_settings_read"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "system_settings_update"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Create storage policy to allow authenticated users to read logos
CREATE POLICY "logos_read_policy"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'logos');

-- Create storage policy to allow admins to insert logos
CREATE POLICY "logos_insert_policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create storage policy to allow admins to delete logos
CREATE POLICY "logos_delete_policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial settings
INSERT INTO system_settings (id, system_name, primary_color)
VALUES (1, 'Loker', '#2563eb');