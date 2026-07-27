-- Consentimento explícito para mensagens automáticas de WhatsApp.
ALTER TABLE donors
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN donors.whatsapp_opt_in IS
  'Consentimento explícito do doador para receber mensagens via WhatsApp.';

CREATE INDEX IF NOT EXISTS idx_follow_ups_due_status
  ON follow_ups (due_date, status);
