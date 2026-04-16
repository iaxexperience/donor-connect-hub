-- Migration: Add must_change_password to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT true;

-- Ensure existing admins don't get forced unless specified
UPDATE profiles SET must_change_password = false WHERE role = 'admin';
