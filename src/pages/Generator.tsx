import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Save, RotateCcw, Loader2, Pencil, Check } from 'lucide-react';

const focusOptions = [
  { value: 'surprise', label: 'Surprise Me \u{1F3B2}' },
  { value: 'upper_body', label: 'Upper Body \u{1F4AA}' },
  { value: 'lower_body', label: 'Lower Body \u{1F9B5}' },
  { value: 'full_body', label: 'Full Body \u{1F3CB}\u{FE0F}' },
  { value: 'core', label: 'Core \u{1F3AF}' },
  { value: 'cardio', label: 'Cardio \u{2764}\u{FE0F}\u{200D}\u{1F525}' },
];

const durationOptions = [10, 20, 30, 45, 60];

const equipmentOptions = [
  'Barbell', 'Dumbbells', 'Kettlebell', 'Pull-up Bar', 'Jump Rope',
  'Rowing Machine', 'Assault Bike', 'Rings', 'Medicine Ball', 'Plyo Box',
];

interface GeneratedExercise {
  name: string;
  sets: number | null;
  reps: number | null;
  weight_suggestion: string;
  duration_seconds: number | null;
  rest_seconds: number | null;
  notes: string;
}

interface GeneratedWOD {
  name: string;
  description: string;
  workout_type: string;
  time_cap_minutes: number | null;
  rounds: number | null;
  exercises: GeneratedExercise[];
  coach_notes: string;
}

const Generator = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [focus, setFocus] = useState('surprise');
  const [duration, setDuration] = useState(20);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedWod, setGeneratedWod] = useState<GeneratedWOD | null>(null);
  const [editingName, setEditingName] = useState(false);

  const toggleEquipment = (item: string) => {
    setEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-wod', {
        body: { focus, duration, equipment, customPrompt },
      });
      if (error) throw new Error(error.message || 'Generation failed');
      if (data?.error) throw new Error(data.error);
      return data as GeneratedWOD;
    },
    onSuccess: (data) => {
      setGeneratedWod(data);
      toast.success('WOD generated! \u{1F525}');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in to save your workouts!');
      if (!generatedWod) throw new Error('No workout to save');

      const { data: workout, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: generatedWod.name,
          description: generatedWod.description,
          workout_type: generatedWod.workout_type,
          time_cap_seconds: generatedWod.time_cap_minutes ? generatedWod.time_cap_minutes * 60 : null,
          rounds: generatedWod.rounds,
        })
        .select()
        .single();

      if (error) throw error;

      // We need exercise IDs from the exercises table. For AI-generated exercises,
      // we'll create them as user exercises if they don't exist
      for (let i = 0; i < generatedWod.exercises.length; i++) {
        const ex = generatedWod.exercises[i];

        // Try to find existing exercise by name
        let { data: existing } = await supabase
          .from('exercises')
          .select('id')
          .ilike('name', ex.name)
          .limit(1)
          .single();

        let exerciseId: string;

        if (existing) {
          exerciseId = existing.id;
        } else {
          // Create new exercise
          const { data: newEx, error: createErr } = await supabase
            .from('exercises')
            .insert({
              name: ex.name,
              category: focus === 'surprise' ? 'general' : focus.replace('_', ' '),
              created_by: user.id,
              is_default: false,
            })
            .select()
            .single();

          if (createErr) throw createErr;
          exerciseId = newEx.id;
        }

        const { error: weError } = await supabase
          .from('workout_exercises')
          .insert({
            workout_id: workout.id,
            exercise_id: exerciseId,
            order_index: i,
            sets: ex.sets,
            reps: ex.reps,
            duration_seconds: ex.duration_seconds,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
          });

        if (weError) throw weError;
      }

      return workout;
    },
    onSuccess: () => {
      toast.success('WOD saved to your workouts! \u{1F4BE}');
      queryClient.invalidateQueries({ queryKey: ['workout-count'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateExerciseField = (index: number, field: keyof GeneratedExercise, value: any) => {
    if (!generatedWod) return;
    setGeneratedWod({
      ...generatedWod,
      exercises: generatedWod.exercises.map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex
      ),
    });
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display text-foreground mb-2">
            AI <span className="text-gradient-fire">WOD Generator</span>
          </h1>
          <p className="text-muted-foreground mb-8">Let AI design your next killer workout.</p>
        </motion.div>

        <div className="space-y-6">
          {/* Focus */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
            <Label className="text-base font-display tracking-wide">Focus Area</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {focusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFocus(opt.value)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    focus === opt.value
                      ? 'border-primary bg-primary/10 text-primary shadow-glow'
                      : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
            <Label className="text-base font-display tracking-wide">Duration</Label>
            <div className="flex gap-2 flex-wrap">
              {durationOptions.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-5 py-3 rounded-lg border text-sm font-medium transition-all ${
                    duration === d
                      ? 'border-primary bg-primary/10 text-primary shadow-glow'
                      : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
            <Label className="text-base font-display tracking-wide">Equipment Available</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {equipmentOptions.map(item => (
                <button
                  key={item}
                  onClick={() => toggleEquipment(item)}
                  className={`px-4 py-2.5 rounded-lg border text-sm transition-all ${
                    equipment.includes(item)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              None selected = Bodyweight Only
            </p>
          </div>

          {/* Custom Prompt */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-2">
            <Label className="text-base font-display tracking-wide">Custom Instructions (Optional)</Label>
            <Textarea
              placeholder="e.g. Include a heavy deadlift complex, keep it beginner-friendly, no running..."
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full bg-gradient-fire hover:opacity-90 transition-opacity h-14 text-lg font-display tracking-wider"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate WOD
              </>
            )}
          </Button>

          {/* Generated Result */}
          <AnimatePresence>
            {generatedWod && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* WOD Header */}
                <div className="bg-card border border-primary/30 rounded-xl p-6 shadow-card shadow-glow space-y-3">
                  <div className="flex items-center gap-2">
                    {editingName ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={generatedWod.name}
                          onChange={e => setGeneratedWod({ ...generatedWod, name: e.target.value })}
                          className="text-xl font-display"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" onClick={() => setEditingName(false)}>
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-display text-gradient-fire flex-1">{generatedWod.name}</h2>
                        <Button size="icon" variant="ghost" onClick={() => setEditingName(true)}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{generatedWod.description}</p>
                  <div className="flex gap-3 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                      {generatedWod.workout_type.replace('_', ' ').toUpperCase()}
                    </span>
                    {generatedWod.time_cap_minutes && (
                      <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                        \u{23F1} {generatedWod.time_cap_minutes} min
                      </span>
                    )}
                    {generatedWod.rounds && (
                      <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                        \u{1F504} {generatedWod.rounds} rounds
                      </span>
                    )}
                  </div>
                </div>

                {/* Exercises - Inline Editable */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-3">
                  <h3 className="text-lg font-display text-foreground">Exercises</h3>
                  {generatedWod.exercises.map((ex, i) => (
                    <div key={i} className="p-4 bg-secondary/50 rounded-lg border border-border space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <Input
                          value={ex.name}
                          onChange={e => updateExerciseField(i, 'name', e.target.value)}
                          className="font-medium border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-foreground"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {ex.sets !== null && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Sets</Label>
                            <Input
                              type="number"
                              value={ex.sets ?? ''}
                              onChange={e => updateExerciseField(i, 'sets', parseInt(e.target.value) || null)}
                              className="h-8"
                            />
                          </div>
                        )}
                        {ex.reps !== null && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Reps</Label>
                            <Input
                              type="number"
                              value={ex.reps ?? ''}
                              onChange={e => updateExerciseField(i, 'reps', parseInt(e.target.value) || null)}
                              className="h-8"
                            />
                          </div>
                        )}
                        {ex.duration_seconds !== null && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Duration (s)</Label>
                            <Input
                              type="number"
                              value={ex.duration_seconds ?? ''}
                              onChange={e => updateExerciseField(i, 'duration_seconds', parseInt(e.target.value) || null)}
                              className="h-8"
                            />
                          </div>
                        )}
                        {ex.rest_seconds !== null && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Rest (s)</Label>
                            <Input
                              type="number"
                              value={ex.rest_seconds ?? ''}
                              onChange={e => updateExerciseField(i, 'rest_seconds', parseInt(e.target.value) || null)}
                              className="h-8"
                            />
                          </div>
                        )}
                      </div>
                      {ex.weight_suggestion && (
                        <p className="text-xs text-muted-foreground">\u{1F4A1} {ex.weight_suggestion}</p>
                      )}
                      {ex.notes && (
                        <Input
                          value={ex.notes}
                          onChange={e => updateExerciseField(i, 'notes', e.target.value)}
                          className="text-xs border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-muted-foreground"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Coach Notes */}
                {generatedWod.coach_notes && (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                    <h3 className="text-lg font-display text-foreground mb-2">\u{1F3CB}\u{FE0F} Coach Notes</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{generatedWod.coach_notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex-1 bg-gradient-fire hover:opacity-90 h-12 font-display tracking-wider"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save WOD'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default Generator;
