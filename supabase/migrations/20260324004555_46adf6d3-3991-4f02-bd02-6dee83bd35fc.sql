
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Exercises library
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  muscle_group TEXT,
  equipment TEXT,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view default exercises" ON public.exercises FOR SELECT USING (is_default = true OR auth.uid() = created_by);
CREATE POLICY "Users can create exercises" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own exercises" ON public.exercises FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own exercises" ON public.exercises FOR DELETE USING (auth.uid() = created_by);

-- Workouts (WODs)
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  workout_type TEXT NOT NULL DEFAULT 'custom',
  time_cap_seconds INTEGER,
  rounds INTEGER,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workouts" ON public.workouts FOR SELECT USING (auth.uid() = user_id OR is_template = true);
CREATE POLICY "Users can create workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON public.workouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workout exercises (join table)
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  reps INTEGER,
  weight_kg NUMERIC,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  notes TEXT
);
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workout exercises" ON public.workout_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND (w.user_id = auth.uid() OR w.is_template = true)));
CREATE POLICY "Users can insert workout exercises" ON public.workout_exercises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can update workout exercises" ON public.workout_exercises FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can delete workout exercises" ON public.workout_exercises FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

-- Workout logs (history)
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  workout_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  rounds_completed INTEGER,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON public.workout_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON public.workout_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.workout_logs FOR DELETE USING (auth.uid() = user_id);

-- Seed default exercises
INSERT INTO public.exercises (name, category, muscle_group, equipment, is_default) VALUES
('Back Squat', 'strength', 'Legs', 'Barbell', true),
('Front Squat', 'strength', 'Legs', 'Barbell', true),
('Deadlift', 'strength', 'Back', 'Barbell', true),
('Bench Press', 'strength', 'Chest', 'Barbell', true),
('Overhead Press', 'strength', 'Shoulders', 'Barbell', true),
('Clean & Jerk', 'olympic', 'Full Body', 'Barbell', true),
('Snatch', 'olympic', 'Full Body', 'Barbell', true),
('Power Clean', 'olympic', 'Full Body', 'Barbell', true),
('Pull-ups', 'gymnastics', 'Back', 'Bodyweight', true),
('Push-ups', 'gymnastics', 'Chest', 'Bodyweight', true),
('Burpees', 'cardio', 'Full Body', 'Bodyweight', true),
('Box Jumps', 'cardio', 'Legs', 'Box', true),
('Rowing', 'cardio', 'Full Body', 'Rower', true),
('Double Unders', 'cardio', 'Full Body', 'Jump Rope', true),
('Wall Balls', 'cardio', 'Full Body', 'Medicine Ball', true),
('Kettlebell Swings', 'strength', 'Full Body', 'Kettlebell', true),
('Thrusters', 'strength', 'Full Body', 'Barbell', true),
('Muscle-ups', 'gymnastics', 'Upper Body', 'Rings', true),
('Handstand Push-ups', 'gymnastics', 'Shoulders', 'Bodyweight', true),
('Toes-to-Bar', 'gymnastics', 'Core', 'Pull-up Bar', true);
