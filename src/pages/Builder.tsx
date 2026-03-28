import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, Search, GripVertical } from 'lucide-react';

interface ExerciseEntry {
  exercise_id: string;
  exercise_name: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  rest_seconds?: number;
}

const workoutTypes = [
  { value: 'custom', label: 'Custom' },
  { value: 'amrap', label: 'AMRAP (As Many Rounds As Possible)' },
  { value: 'emom', label: 'EMOM (Every Minute On the Minute)' },
  { value: 'for_time', label: 'For Time' },
  { value: 'tabata', label: 'Tabata' },
];

const Builder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workoutType, setWorkoutType] = useState('custom');
  const [timeCap, setTimeCap] = useState('');
  const [rounds, setRounds] = useState('');
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: availableExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .order('name');
      return data ?? [];
    },
  });

  const filteredExercises = availableExercises?.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.muscle_group?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Give your WOD a name!');
      if (exercises.length === 0) throw new Error('Add at least one exercise!');

      const { data: workout, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user!.id,
          name,
          description,
          workout_type: workoutType,
          time_cap_seconds: timeCap ? parseInt(timeCap) * 60 : null,
          rounds: rounds ? parseInt(rounds) : null,
        })
        .select()
        .single();

      if (error) throw error;

      const exerciseInserts = exercises.map((ex, i) => ({
        workout_id: workout.id,
        exercise_id: ex.exercise_id,
        order_index: i,
        sets: ex.sets || null,
        reps: ex.reps || null,
        weight_kg: ex.weight_kg || null,
        duration_seconds: ex.duration_seconds || null,
        rest_seconds: ex.rest_seconds || null,
      }));

      const { error: exError } = await supabase
        .from('workout_exercises')
        .insert(exerciseInserts);

      if (exError) throw exError;
      return workout;
    },
    onSuccess: () => {
      toast.success('WOD saved! 🔥');
      queryClient.invalidateQueries({ queryKey: ['workout-count'] });
      setName('');
      setDescription('');
      setWorkoutType('custom');
      setTimeCap('');
      setRounds('');
      setExercises([]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addExercise = (ex: { id: string; name: string }) => {
    setExercises(prev => [...prev, {
      exercise_id: ex.id,
      exercise_name: ex.name,
      sets: 3,
      reps: 10,
    }]);
    setSearchTerm('');
  };

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof ExerciseEntry, value: any) => {
    setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display text-foreground mb-2">
            Build Your <span className="text-gradient-fire">WOD</span>
          </h1>
          <p className="text-muted-foreground mb-8">Design a workout that pushes your limits.</p>
        </motion.div>

        <div className="space-y-6">
          {/* Workout Info */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workout Name</Label>
                <Input placeholder="e.g. Monday Mayhem" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={workoutType} onValueChange={setWorkoutType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {workoutTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Cap (minutes)</Label>
                <Input type="number" placeholder="Optional" value={timeCap} onChange={e => setTimeCap(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rounds</Label>
                <Input type="number" placeholder="Optional" value={rounds} onChange={e => setRounds(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Optional notes about this WOD" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Exercise Search */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h2 className="text-lg font-display text-foreground mb-4">Add Exercises</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && filteredExercises && (
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg mb-4">
                {filteredExercises.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    className="w-full text-left px-4 py-2 hover:bg-secondary transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="text-foreground">{ex.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{ex.category} • {ex.muscle_group}</span>
                    </div>
                    <Plus className="w-4 h-4 text-primary" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Exercises */}
          <AnimatePresence>
            {exercises.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card border border-border rounded-xl p-6 shadow-card"
              >
                <h2 className="text-lg font-display text-foreground mb-4">
                  Exercises ({exercises.length})
                </h2>
                <div className="space-y-3">
                  {exercises.map((ex, i) => (
                    <motion.div
                      key={i}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg border border-border"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-2 shrink-0" />
                      <div className="flex-1 space-y-3">
                        <p className="font-medium text-foreground">{ex.exercise_name}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs">Sets</Label>
                            <Input
                              type="number"
                              value={ex.sets || ''}
                              onChange={e => updateExercise(i, 'sets', parseInt(e.target.value) || undefined)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Reps</Label>
                            <Input
                              type="number"
                              value={ex.reps || ''}
                              onChange={e => updateExercise(i, 'reps', parseInt(e.target.value) || undefined)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Weight (kg)</Label>
                            <Input
                              type="number"
                              value={ex.weight_kg || ''}
                              onChange={e => updateExercise(i, 'weight_kg', parseFloat(e.target.value) || undefined)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Rest (sec)</Label>
                            <Input
                              type="number"
                              value={ex.rest_seconds || ''}
                              onChange={e => updateExercise(i, 'rest_seconds', parseInt(e.target.value) || undefined)}
                              className="h-8"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExercise(i)}
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save */}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full bg-gradient-fire hover:opacity-90 transition-opacity h-12 text-lg font-display tracking-wider"
          >
            <Save className="w-5 h-5 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save WOD'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Builder;
