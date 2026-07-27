INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('whatsapp-media', 'whatsapp-media', false, 16777216, ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'video/mp4', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated read WhatsApp media" ON storage.objects;
CREATE POLICY "Authenticated read WhatsApp media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'whatsapp-media');