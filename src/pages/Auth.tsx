import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Flame, Dumbbell } from 'lucide-react';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
        toast.success('Account created! 🔥');
        navigate('/dashboard');
      } else {
        await signIn(email, password);
        toast.success('Welcome back! 🔥');
        navigate('/dashboard');
      }
    } catch (error: any) {
      const msg = error.message || 'Something went wrong';
      setMessage(`❌ ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-dark)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-fire mb-4"
          >
            <Flame className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-4xl font-bold font-display text-foreground tracking-wider">
            WOD <span className="text-gradient-fire">Builder</span>
          </h1>
          <p className="text-muted-foreground mt-2">Build. Train. Dominate.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex gap-2 mb-6">
            <Button
              variant={!isSignUp ? 'default' : 'secondary'}
              className="flex-1"
              onClick={() => setIsSignUp(false)}
            >
              Sign In
            </Button>
            <Button
              variant={isSignUp ? 'default' : 'secondary'}
              className="flex-1"
              onClick={() => setIsSignUp(true)}
            >
              Sign Up
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="athlete@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-fire hover:opacity-90 transition-opacity" disabled={loading}>
              <Dumbbell className="w-4 h-4 mr-2" />
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Let\'s Go'}
            </Button>
            {message && (
              <p className={`text-sm text-center mt-2 ${message.startsWith('❌') ? 'text-destructive' : 'text-primary'}`}>
                {message}
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
