/*
  # Create admin user

  1. Security
    - Creates admin user with specified credentials
    - Email: admin
    - Password: M@ster10
    - Sets admin role in user metadata
*/

-- Create admin user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin',
  crypt('M@ster10', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);