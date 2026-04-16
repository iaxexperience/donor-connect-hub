-- Fix role for hospital@hospitaldafap.org.br
UPDATE profiles SET role = 'admin' WHERE email = 'hospital@hospitaldafap.org.br';

-- Ensure it's active as well
UPDATE profiles SET status = 'Ativo' WHERE email = 'hospital@hospitaldafap.org.br';
