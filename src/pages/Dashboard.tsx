import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Flame, Hammer, Clock, Trophy, Zap } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
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

  const { data: workoutCount } = useQuery({
    queryKey: ['workout-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: logCount } = useQuery({
    queryKey: ['log-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: recentLogs } = useQuery({
    queryKey: ['recent-logs', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user!.id)
        .order('completed_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const stats = [
    { label: 'Workouts Created', value: workoutCount ?? 0, icon: Hammer, color: 'text-primary' },
    { label: 'Sessions Logged', value: logCount ?? 0, icon: Clock, color: 'text-success' },
    { label: 'This Week', value: recentLogs?.filter(l => {
      const d = new Date(l.completed_at);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    }).length ?? 0, icon: Zap, color: 'text-warning' },
  ];

  return (
    <AppLayout>
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display text-foreground">
            Welcome back, <span className="text-gradient-fire">{profile?.display_name || 'Athlete'}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Ready to crush it today?</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div className={`${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-display text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link to="/builder">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-fire rounded-xl p-6 cursor-pointer shadow-glow"
            >
              <Hammer className="w-8 h-8 text-primary-foreground mb-3" />
              <h2 className="text-xl font-display text-primary-foreground">Build a WOD</h2>
              <p className="text-primary-foreground/80 text-sm mt-1">Create a custom workout from scratch</p>
            </motion.div>
          </Link>
          <Link to="/templates">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card border border-border rounded-xl p-6 cursor-pointer shadow-card hover:border-primary/50 transition-colors"
            >
              <Trophy className="w-8 h-8 text-primary mb-3" />
              <h2 className="text-xl font-display text-foreground">WOD Templates</h2>
              <p className="text-muted-foreground text-sm mt-1">Choose from pre-built workout formats</p>
            </motion.div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h2 className="text-lg font-display text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Recent Activity
          </h2>
          {recentLogs && recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-foreground font-medium">{log.workout_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(log.completed_at).toLocaleDateString()}
                      {log.duration_seconds && ` • ${Math.round(log.duration_seconds / 60)} min`}
                    </p>
                  </div>
                  {log.rating && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: log.rating }).map((_, i) => (
                        <Flame key={i} className="w-4 h-4 text-primary fill-primary" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No workouts logged yet. Time to start training! 💪
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
