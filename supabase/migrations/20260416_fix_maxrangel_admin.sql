-- Fix access for maxrangelformiga@gmail.com
-- Updates status, role and unlocks password change requirement
UPDATE profiles
SET
  role   = 'admin',
  status = 'Ativo',
  must_change_password = false
WHERE email = 'maxrangelformiga@gmail.com';

-- If the profile row doesn't exist yet (user registered but profile wasn't created)
-- this INSERT will create it; the id will be linked later by AuthContext via email lookup.
INSERT INTO profiles (email, name, role, status, must_change_password)
SELECT
  'maxrangelformiga@gmail.com',
  'Max Rangel',
  'admin',
  'Ativo',
  false
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE email = 'maxrangelformiga@gmail.com'
);
