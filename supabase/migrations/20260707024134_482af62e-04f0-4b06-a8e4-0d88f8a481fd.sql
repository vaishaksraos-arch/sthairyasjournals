
-- Allow public read access to article-media bucket via public URLs
CREATE POLICY "Public read article-media"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'article-media');

-- Allow authenticated users (admins/editors) to upload to article-media
CREATE POLICY "Authenticated upload article-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-media');

CREATE POLICY "Authenticated update article-media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'article-media')
WITH CHECK (bucket_id = 'article-media');

CREATE POLICY "Authenticated delete article-media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'article-media');
