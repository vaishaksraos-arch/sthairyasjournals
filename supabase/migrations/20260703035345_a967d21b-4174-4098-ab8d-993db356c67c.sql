
ALTER TABLE public.blogs ALTER COLUMN show_assessment SET DEFAULT false;
ALTER TABLE public.blogs ALTER COLUMN show_treatment SET DEFAULT false;
ALTER TABLE public.blogs ALTER COLUMN show_exercises SET DEFAULT false;
UPDATE public.blogs SET show_assessment = false, show_treatment = false, show_exercises = false;
