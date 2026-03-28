import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Clock, Flame, Plus, Trash2, Calendar } from 'lucide-react';

const History = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [manualWorkoutName, setManualWorkoutName] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState('');
  const [roundsCompleted, setRoundsCompleted] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(3);

  const { data: workouts } = useQuery({
    queryKey: ['user-workouts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['workout-logs', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user!.id)
        .order('completed_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      const workout = workouts?.find(w => w.id === selectedWorkout);
      const finalName = selectedWorkout ? (workout?.name || 'Unknown') : manualWorkoutName.trim();
      if (!finalName) throw new Error('Enter a workout name or select one');

      const { error } = await supabase.from('workout_logs').insert({
        user_id: user!.id,
        workout_id: selectedWorkout || null,
        workout_name: finalName,
        completed_at: new Date(workoutDate).toISOString(),
        duration_seconds: duration ? parseInt(duration) * 60 : null,
        rounds_completed: roundsCompleted ? parseInt(roundsCompleted) : null,
        notes: notes || null,
        rating,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Workout logged! 💪');
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['log-count'] });
      queryClient.invalidateQueries({ queryKey: ['recent-logs'] });
      setLogDialogOpen(false);
      setSelectedWorkout('');
      setManualWorkoutName('');
      setWorkoutDate(new Date().toISOString().slice(0, 10));
      setDuration('');
      setRoundsCompleted('');
      setNotes('');
      setRating(3);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Log deleted');
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['log-count'] });
      queryClient.invalidateQueries({ queryKey: ['recent-logs'] });
    },
  });

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-display text-foreground">
              Workout <span className="text-gradient-fire">History</span>
            </h1>
            <p className="text-muted-foreground mt-1">Track your progress over time.</p>
          </motion.div>

          <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-fire hover:opacity-90">
                <Plus className="w-4 h-4 mr-1" /> Log Workout
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display text-foreground">Log a Workout</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Workout Name</Label>
                  <Input
                    placeholder="e.g. Fran, Murph, Monday session..."
                    value={manualWorkoutName}
                    onChange={e => { setManualWorkoutName(e.target.value); setSelectedWorkout(''); }}
                  />
                </div>
                {workouts && workouts.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Or pick from your saved WODs</Label>
                    <Select value={selectedWorkout} onValueChange={v => { setSelectedWorkout(v); setManualWorkoutName(''); }}>
                      <SelectTrigger><SelectValue placeholder="Select a workout" /></SelectTrigger>
                      <SelectContent>
                        {workouts.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={workoutDate} onChange={e => setWorkoutDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rounds</Label>
                    <Input type="number" value={roundsCompleted} onChange={e => setRoundsCompleted(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setRating(r)}>
                        <Flame className={`w-6 h-6 transition-colors ${r <= rating ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input placeholder="How did it feel?" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <Button
                  onClick={() => logMutation.mutate()}
                  disabled={logMutation.isPending}
                  className="w-full bg-gradient-fire hover:opacity-90"
                >
                  {logMutation.isPending ? 'Saving...' : 'Log It'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-xl p-5 shadow-card flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display text-foreground">{log.workout_name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{new Date(log.completed_at).toLocaleDateString()}</span>
                      {log.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {Math.round(log.duration_seconds / 60)} min
                        </span>
                      )}
                      {log.rounds_completed && <span>{log.rounds_completed} rounds</span>}
                    </div>
                    {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {log.rating && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: log.rating }).map((_, i) => (
                        <Flame key={i} className="w-4 h-4 text-primary fill-primary" />
                      ))}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(log.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card border border-border rounded-xl shadow-card">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-display text-foreground mb-2">No Workouts Logged</h2>
            <p className="text-muted-foreground mb-4">Complete a workout and log it here to track your progress.</p>
            <Button onClick={() => setLogDialogOpen(true)} className="bg-gradient-fire hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Log Your First Workout
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default History;
