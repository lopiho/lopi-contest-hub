import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trophy, Sparkles, Mail, Lock, User } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Neplatný email'),
  password: z.string().min(6, 'Heslo musí mít alespoň 6 znaků'),
});

const signupSchema = loginSchema.extend({
  username: z.string().min(3, 'Jméno musí mít alespoň 3 znaky').max(20, 'Jméno může mít max 20 znaků'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', username: '' });

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Nesprávný email nebo heslo');
      } else {
        toast.error('Chyba při přihlášení');
      }
    } else {
      toast.success('Úspěšně přihlášeno!');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.username);
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Tento email je již registrován');
      } else {
        toast.error('Chyba při registraci');
      }
    } else {
      toast.success('Účet vytvořen! Vítej v soutěži!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-success/20 rounded-full blur-2xl animate-pulse-slow" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-hero border-0 bg-card/95 backdrop-blur-sm animate-scale-in">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow animate-bounce-subtle">
            <Trophy className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-display font-bold gradient-text">
              Lopiho Soutěž
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Připoj se k soutěži a sbírej body!
              <Sparkles className="w-4 h-4 text-primary" />
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="font-semibold">Přihlášení</TabsTrigger>
              <TabsTrigger value="signup" className="font-semibold">Registrace</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tvuj@email.cz"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Heslo
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Přihlašuji...' : 'Přihlásit se'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Uživatelské jméno
                  </Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="TvujNick"
                    value={signupForm.username}
                    onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tvuj@email.cz"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Heslo
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Registruji...' : 'Vytvořit účet'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
