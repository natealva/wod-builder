import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Flame, Home, Hammer, Zap, ClipboardList, User, LogOut, Sparkles } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/generator', label: 'AI Gen', icon: Sparkles },
  { to: '/templates', label: 'Templates', icon: Zap },
  { to: '/builder', label: 'Build', icon: Hammer },
  { to: '/history', label: 'History', icon: ClipboardList },
  { to: '/profile', label: 'Profile', icon: User },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-fire flex items-center justify-center">
              <Flame className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl tracking-wider text-foreground">
              WOD <span className="text-gradient-fire">Builder</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={isActive ? 'bg-gradient-fire' : ''}
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex border-t border-border">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className="flex-1">
                <div className={`flex flex-col items-center gap-1 py-2 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
