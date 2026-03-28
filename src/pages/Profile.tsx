import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { User, Save } from 'lucide-react';

const fitnessLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' },
];

const equipmentOptions = [
  'Barbell', 'Dumbbells', 'Kettlebell', 'Pull-up Bar',
  'Jump Rope', 'Rowing Machine', 'Assault Bike', 'Rings',
  'Medicine Ball', 'Plyo Box', 'Resistance Bands', 'None',
];

const goalOptions = [
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'strength', label: 'Build Strength' },
  { value: 'endurance', label: 'Improve Endurance' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'competition', label: 'Competition Prep' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('beginner');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [goal, setGoal] = useState('general_fitness');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setFitnessLevel((profile as any).fitness_level || 'beginner');
      setEquipment((profile as any).equipment || []);
      setGoal((profile as any).goal || 'general_fitness');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          fitness_level: fitnessLevel,
          equipment,
          goal,
        } as any)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profile saved! 🔥');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleEquipment = (item: string) => {
    setEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-8 text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-fire flex items-center justify-center">
              <User className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display text-foreground">
                Your <span className="text-gradient-fire">Profile</span>
              </h1>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Display Name */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
            <h2 className="text-lg font-display text-foreground">Basic Info</h2>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
          </div>

          {/* Fitness Level */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
            <h2 className="text-lg font-display text-foreground">Fitness Level</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {fitnessLevels.map(level => (
                <button
                  key={level.value}
                  onClick={() => setFitnessLevel(level.value)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    fitnessLevel === level.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/50 text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
            <h2 className="text-lg font-display text-foreground">Available Equipment</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {equipmentOptions.map(item => (
                <label
                  key={item}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    equipment.includes(item)
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-secondary/50 hover:border-muted-foreground'
                  }`}
                >
                  <Checkbox
                    checked={equipment.includes(item)}
                    onCheckedChange={() => toggleEquipment(item)}
                  />
                  <span className="text-sm text-foreground">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
            <h2 className="text-lg font-display text-foreground">Training Goal</h2>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {goalOptions.map(g => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Save */}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full bg-gradient-fire hover:opacity-90 h-12 text-lg font-display tracking-wider"
          >
            <Save className="w-5 h-5 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
          </Button>

          {/* Sign Out */}
          <Button
            variant="secondary"
            className="w-full"
            onClick={async () => {
              await signOut();
              window.location.href = '/';
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
