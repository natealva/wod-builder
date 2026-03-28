ALTER TABLE public.profiles
ADD COLUMN fitness_level text DEFAULT 'beginner',
ADD COLUMN equipment text[] DEFAULT '{}',
ADD COLUMN goal text DEFAULT 'general_fitness';