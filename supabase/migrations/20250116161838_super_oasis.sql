/*
  # Add category to vehicles table

  1. Changes
    - Add category enum type for vehicle categories
    - Add category column to vehicles table with default value
*/

-- Create vehicle category enum
CREATE TYPE vehicle_category AS ENUM (
  'popular',
  'gold',
  'black',
  'super'
);

-- Add category column to vehicles table
ALTER TABLE vehicles 
  ADD COLUMN category vehicle_category NOT NULL DEFAULT 'popular';