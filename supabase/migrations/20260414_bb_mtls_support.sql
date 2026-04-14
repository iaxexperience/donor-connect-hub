-- Add columns for mTLS certificates to bb_settings
ALTER TABLE public.bb_settings 
ADD COLUMN IF NOT EXISTS client_cert TEXT,
ADD COLUMN IF NOT EXISTS client_key TEXT;

-- Refresh policies (optional but safe)
DROP POLICY IF EXISTS "auth_all_bb_settings" ON bb_settings;
CREATE POLICY "auth_all_bb_settings" ON bb_settings FOR ALL TO public USING (true) WITH CHECK (true);
