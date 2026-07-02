
-- 1. Add 'editor' role (must commit before referencing in policies below via SQL fn — has_role uses text cast so OK)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
