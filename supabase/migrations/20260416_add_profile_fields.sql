-- Migration: Add CPF and Phone to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
