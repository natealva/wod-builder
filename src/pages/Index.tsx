import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Flame, Dumbbell, Zap, Clock, ChevronRight } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  const features = [
    { icon: Dumbbell, title: 'Custom WOD Builder', desc: 'Design workouts with exercises, sets, reps, and rest times.' },
    { icon: Zap, title: 'Pre-Built Templates', desc: 'Classic WODs like Fran, Cindy, and Tabata formats ready to go.' },
    { icon: Clock, title: 'Track Progress', desc: 'Log every session and watch your fitness journey unfold.' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-dark)' }}>
      {/* Hero */}
      <div className="container flex flex-col items-center justify-center min-h-[80vh] text-center py-20">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 150, delay: 0.1 }}
          className="w-20 h-20 rounded-2xl bg-gradient-fire flex items-center justify-center mb-6 animate-pulse-glow"
        >
          <Flame className="w-10 h-10 text-primary-foreground" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-7xl font-display font-bold text-foreground tracking-wider mb-4"
        >
          WOD <span className="text-gradient-fire">Builder</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-muted-foreground max-w-md mb-8"
        >
          Build killer workouts. Track your progress. Dominate every session.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-4"
        >
          <Link to={user ? '/dashboard' : '/builder'}>
            <Button size="lg" className="bg-gradient-fire hover:opacity-90 transition-opacity font-display tracking-wider text-lg px-8 h-14 shadow-glow">
              {user ? 'Go to Dashboard' : 'Get Started'}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Features */}
      <div className="container pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.15 }}
                className="bg-card border border-border rounded-xl p-6 shadow-card hover:border-primary/30 transition-colors"
              >
                <Icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-lg font-display text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
