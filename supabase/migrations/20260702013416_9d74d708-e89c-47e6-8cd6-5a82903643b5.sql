
DROP POLICY IF EXISTS "article-media public read" ON storage.objects;
CREATE POLICY "article-media public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'article-media');

DROP POLICY IF EXISTS "article-media admin editor write" ON storage.objects;
CREATE POLICY "article-media admin editor write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'article-media'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'editor'::public.app_role))
  );

DROP POLICY IF EXISTS "article-media admin editor update" ON storage.objects;
CREATE POLICY "article-media admin editor update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'article-media'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'editor'::public.app_role))
  );

DROP POLICY IF EXISTS "article-media admin editor delete" ON storage.objects;
CREATE POLICY "article-media admin editor delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'article-media'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'editor'::public.app_role))
  );
