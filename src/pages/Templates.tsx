import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Zap, Clock, RotateCw, Timer, Flame, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const templates = [
  {
    name: 'Fran',
    type: 'for_time',
    description: '21-15-9 Thrusters & Pull-ups. A classic CrossFit benchmark.',
    icon: Zap,
    exercises: ['Thrusters', 'Pull-ups'],
    scheme: '21-15-9',
    color: 'from-red-600 to-orange-500',
  },
  {
    name: 'Cindy',
    type: 'amrap',
    description: '20 min AMRAP: 5 Pull-ups, 10 Push-ups, 15 Squats.',
    icon: RotateCw,
    exercises: ['Pull-ups', 'Push-ups', 'Back Squat'],
    scheme: '5-10-15',
    timeCap: 20,
  },
  {
    name: 'Tabata Burner',
    type: 'tabata',
    description: '8 rounds of 20s work / 10s rest. Burpees & Box Jumps.',
    icon: Timer,
    exercises: ['Burpees', 'Box Jumps'],
    scheme: '20s on / 10s off',
    rounds: 8,
  },
  {
    name: 'EMOM Strength',
    type: 'emom',
    description: '10 min EMOM: Odd - 5 Deadlifts, Even - 10 Push-ups.',
    icon: Clock,
    exercises: ['Deadlift', 'Push-ups'],
    scheme: '5 / 10 alternating',
    timeCap: 10,
  },
  {
    name: 'The Grinder',
    type: 'for_time',
    description: '5 rounds: 10 Power Cleans, 15 Wall Balls, 20 Double Unders.',
    icon: Flame,
    exercises: ['Power Clean', 'Wall Balls', 'Double Unders'],
    scheme: '10-15-20 x5 rounds',
    rounds: 5,
  },
  {
    name: 'Olympic Complex',
    type: 'custom',
    description: 'Clean & Jerk + Snatch complex. Heavy day focus.',
    icon: Zap,
    exercises: ['Clean & Jerk', 'Snatch'],
    scheme: '3+3 x5 sets',
    rounds: 5,
  },
];

const Templates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const useTemplate = async (template: typeof templates[0]) => {
    if (!user) {
      toast.error('Sign in to save templates to your workouts!');
      return;
    }
    setSaving(template.name);
    try {
      // Get exercise IDs
      const { data: exerciseData } = await supabase
        .from('exercises')
        .select('id, name')
        .in('name', template.exercises);

      if (!exerciseData || exerciseData.length === 0) {
        throw new Error('Could not find exercises');
      }

      const { data: workout, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: template.name,
          description: template.description,
          workout_type: template.type,
          time_cap_seconds: template.timeCap ? template.timeCap * 60 : null,
          rounds: template.rounds || null,
        })
        .select()
        .single();

      if (error) throw error;

      const exerciseInserts = exerciseData.map((ex, i) => ({
        workout_id: workout.id,
        exercise_id: ex.id,
        order_index: i,
        reps: 10,
        sets: 3,
      }));

      await supabase.from('workout_exercises').insert(exerciseInserts);

      toast.success(`${template.name} added to your workouts! \u{1F525}`);
      queryClient.invalidateQueries({ queryKey: ['workout-count'] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <AppLayout>
      <div className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display text-foreground mb-2">
            WOD <span className="text-gradient-fire">Templates</span>
          </h1>
          <p className="text-muted-foreground mb-8">Battle-tested workouts ready to deploy.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template, i) => {
            const Icon = template.icon;
            return (
              <motion.div
                key={template.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-6 shadow-card hover:border-primary/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-fire flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full uppercase tracking-wider">
                    {template.type.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-xl font-display text-foreground mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {template.exercises.map(ex => (
                    <span key={ex} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {ex}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-primary font-medium mb-4">{template.scheme}</p>
                <Button
                  onClick={() => useTemplate(template)}
                  disabled={saving === template.name}
                  className="w-full bg-gradient-fire hover:opacity-90 transition-opacity"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {saving === template.name ? 'Adding...' : 'Use Template'}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Templates;
