-- Create table to track generated PDFs
CREATE TABLE IF NOT EXISTS quote_pdfs (
  id SERIAL PRIMARY KEY,
  customer_email VARCHAR(255),
  prospect_name VARCHAR(255),
  file_name VARCHAR(500) NOT NULL,
  quote_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quote_pdfs_customer_email ON quote_pdfs(customer_email);
CREATE INDEX IF NOT EXISTS idx_quote_pdfs_prospect_name ON quote_pdfs(prospect_name);
CREATE INDEX IF NOT EXISTS idx_quote_pdfs_created_at ON quote_pdfs(created_at);
