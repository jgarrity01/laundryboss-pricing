-- Add phone number field to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_phone TEXT;
