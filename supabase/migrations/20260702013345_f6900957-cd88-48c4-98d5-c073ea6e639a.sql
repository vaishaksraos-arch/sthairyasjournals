
-- Extend blogs
ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS author_qualification TEXT,
  ADD COLUMN IF NOT EXISTS author_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS body_part TEXT,
  ADD COLUMN IF NOT EXISTS show_assessment BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_treatment BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_exercises BOOLEAN NOT NULL DEFAULT true;

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles(username) WHERE username IS NOT NULL;

-- Editor policies on blogs
DROP POLICY IF EXISTS "editors insert own blogs" ON public.blogs;
CREATE POLICY "editors insert own blogs" ON public.blogs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'editor'::public.app_role) AND author_id = auth.uid());

DROP POLICY IF EXISTS "editors update own blogs" ON public.blogs;
CREATE POLICY "editors update own blogs" ON public.blogs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'editor'::public.app_role) AND author_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'editor'::public.app_role) AND author_id = auth.uid());

DROP POLICY IF EXISTS "editors delete own blogs" ON public.blogs;
CREATE POLICY "editors delete own blogs" ON public.blogs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'editor'::public.app_role) AND author_id = auth.uid());

-- Site settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  global_redirect_url TEXT,
  fab_redirect_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site settings readable by all" ON public.site_settings;
CREATE POLICY "site settings readable by all" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins manage site settings" ON public.site_settings;
CREATE POLICY "admins manage site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Bulk emoji remap based on title
UPDATE public.blogs SET cover_emoji = CASE
  WHEN title ILIKE '%rotator cuff%' OR title ILIKE '%shoulder%' THEN '🙋'
  WHEN title ILIKE '%frozen%' THEN '💪'
  WHEN title ILIKE '%acl%' OR title ILIKE '%meniscus%' OR title ILIKE '%knee%' OR title ILIKE '%patellofemoral%' OR title ILIKE '%iliotibial%' THEN '🦵'
  WHEN title ILIKE '%hip%' THEN '🦿'
  WHEN title ILIKE '%achilles%' OR title ILIKE '%ankle%' OR title ILIKE '%plantar%' OR title ILIKE '%foot%' THEN '🦶'
  WHEN title ILIKE '%whiplash%' OR title ILIKE '%cervic%' OR title ILIKE '%neck%' THEN '🗣️'
  WHEN title ILIKE '%tmj%' OR title ILIKE '%migraine%' OR title ILIKE '%headache%' THEN '🧠'
  WHEN title ILIKE '%back%' OR title ILIKE '%spine%' OR title ILIKE '%disc%' OR title ILIKE '%spondy%' OR title ILIKE '%stenosis%' OR title ILIKE '%scoliosis%' THEN '🩻'
  WHEN title ILIKE '%elbow%' OR title ILIKE '%tennis%' OR title ILIKE '%golfer%' THEN '💪'
  WHEN title ILIKE '%carpal%' OR title ILIKE '%wrist%' OR title ILIKE '%finger%' OR title ILIKE '%hand%' OR title ILIKE '%de quervain%' THEN '🤲'
  WHEN title ILIKE '%hamstring%' OR title ILIKE '%groin%' OR title ILIKE '%adductor%' THEN '🦵'
  WHEN title ILIKE '%shin%' OR title ILIKE '%stress fracture%' OR title ILIKE '%fracture%' THEN '🦴'
  WHEN title ILIKE '%stroke%' OR title ILIKE '%parkinson%' OR title ILIKE '%multiple sclerosis%' OR title ILIKE '%brain%' OR title ILIKE '%bell%' OR title ILIKE '%concussion%' THEN '🧠'
  WHEN title ILIKE '%spinal cord%' THEN '🧬'
  WHEN title ILIKE '%vestibul%' OR title ILIKE '%bppv%' OR title ILIKE '%dizzin%' THEN '🌀'
  WHEN title ILIKE '%fall%' OR title ILIKE '%geriatric%' OR title ILIKE '%older%' OR title ILIKE '%sarcopenia%' OR title ILIKE '%osteoporo%' THEN '🧓'
  WHEN title ILIKE '%pediatric%' OR title ILIKE '%cerebral palsy%' OR title ILIKE '%torticollis%' OR title ILIKE '%child%' OR title ILIKE '%infant%' OR title ILIKE '%developmental%' THEN '👶'
  WHEN title ILIKE '%fibromyalgia%' OR title ILIKE '%chronic pain%' OR title ILIKE '%crps%' OR title ILIKE '%chronic fatigue%' THEN '💊'
  WHEN title ILIKE '%covid%' THEN '🫁'
  WHEN title ILIKE '%cardiac%' THEN '🫀'
  WHEN title ILIKE '%pulmonary%' OR title ILIKE '%copd%' OR title ILIKE '%asthma%' OR title ILIKE '%breathing%' OR title ILIKE '%diaphrag%' THEN '🫁'
  WHEN title ILIKE '%pelvic%' OR title ILIKE '%prostat%' OR title ILIKE '%incontinen%' THEN '🩺'
  WHEN title ILIKE '%postnatal%' OR title ILIKE '%prenatal%' OR title ILIKE '%diastasis%' THEN '🤰'
  WHEN title ILIKE '%lymphedema%' OR title ILIKE '%mastectomy%' THEN '🎗️'
  WHEN title ILIKE '%amputee%' OR title ILIKE '%prosthetic%' THEN '🦿'
  WHEN title ILIKE '%burn%' THEN '🔥'
  WHEN title ILIKE '%dry needling%' THEN '💉'
  WHEN title ILIKE '%manual therapy%' OR title ILIKE '%myofascial%' OR title ILIKE '%iastm%' OR title ILIKE '%instrument%' THEN '🤝'
  WHEN title ILIKE '%tape%' OR title ILIKE '%kinesio%' THEN '🎗️'
  WHEN title ILIKE '%bfr%' OR title ILIKE '%blood flow%' THEN '🩸'
  WHEN title ILIKE '%tendinopathy%' OR title ILIKE '%isometric%' OR title ILIKE '%eccentric%' THEN '🏋️'
  WHEN title ILIKE '%runner%' OR title ILIKE '%running%' OR title ILIKE '%return-to-sport%' OR title ILIKE '%return to sport%' THEN '🏃'
  WHEN title ILIKE '%cycling%' OR title ILIKE '%bike%' THEN '🚴'
  WHEN title ILIKE '%swim%' THEN '🏊'
  WHEN title ILIKE '%overhead athlete%' OR title ILIKE '%sport%' OR title ILIKE '%athlete%' OR title ILIKE '%female athlete%' OR title ILIKE '%red-s%' THEN '🏅'
  WHEN title ILIKE '%warm-up%' OR title ILIKE '%warmup%' THEN '🔥'
  WHEN title ILIKE '%foam roll%' THEN '🧻'
  WHEN title ILIKE '%cryo%' OR title ILIKE '%heat%' THEN '❄️'
  WHEN title ILIKE '%electrotherapy%' OR title ILIKE '%electr%' THEN '⚡'
  WHEN title ILIKE '%telehealth%' OR title ILIKE '%wearable%' OR title ILIKE '% ai %' THEN '📱'
  WHEN title ILIKE '%ergonomic%' OR title ILIKE '%posture%' OR title ILIKE '%desk%' OR title ILIKE '%text neck%' THEN '💻'
  WHEN title ILIKE '%sleep%' THEN '💤'
  WHEN title ILIKE '%piriformis%' OR title ILIKE '%sacroiliac%' OR title ILIKE '%arthritis%' OR title ILIKE '%osteoarthritis%' THEN '🦴'
  WHEN title ILIKE '%hypermobility%' OR title ILIKE '%ehlers%' THEN '🤸'
  WHEN title ILIKE '%replacement%' OR title ILIKE '%arthroplasty%' OR title ILIKE '%post-surg%' OR title ILIKE '%post surg%' THEN '🩹'
  ELSE cover_emoji
END;
