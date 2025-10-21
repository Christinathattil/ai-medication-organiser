-- Migration: Add food_timing column to schedules table
-- Purpose: Support before_food, with_food, after_food, or none options
-- Date: 2024

-- Add the food_timing column to schedules table
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS food_timing TEXT DEFAULT 'none' CHECK (food_timing IN ('none', 'before_food', 'with_food', 'after_food'));

-- Update existing records: set food_timing based on with_food boolean
-- If with_food is true, set to 'with_food', otherwise 'none'
UPDATE schedules
SET food_timing = CASE 
  WHEN with_food = true THEN 'with_food'
  ELSE 'none'
END
WHERE food_timing IS NULL OR food_timing = 'none';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_schedules_food_timing ON schedules(food_timing);

-- Note: Keep the with_food column for backward compatibility
-- The application will now primarily use food_timing, but with_food
-- will be set to true when food_timing = 'with_food' for compatibility

COMMENT ON COLUMN schedules.food_timing IS 'Specifies when medication should be taken relative to food: none, before_food, with_food, or after_food';
