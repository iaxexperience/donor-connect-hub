-- Grant full admin access to hospital@hospitaldafap.org.br
UPDATE profiles
SET
  role = 'admin',
  status = 'Ativo',
  must_change_password = false
WHERE email = 'hospital@hospitaldafap.org.br';
