import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trophy, Sparkles, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', username: '' });

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!z.string().email().safeParse(resetEmail).success) {
      toast.error('Neplatný email');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    setLoading(false);

    if (error) {
      toast.error('Chyba při odesílání emailu');
    } else {
      toast.success('Email s odkazem pro reset hesla byl odeslán!');
      setShowForgotPassword(false);
      setResetEmail('');
    }
  };

  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get('reset') === 'true';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user && !isResetMode) {
      navigate('/');
    }
  }, [user, navigate, isResetMode]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Heslo musí mít alespoň 6 znaků');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Hesla se neshodují');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error('Chyba při změně hesla');
    } else {
      toast.success('Heslo bylo úspěšně změněno!');
      navigate('/');
    }
  };

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

  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <Card className="w-full max-w-md relative z-10 shadow-hero border-0 bg-card/95 backdrop-blur-sm animate-scale-in">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display font-bold gradient-text">
                Nastavit nové heslo
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Zadejte své nové heslo
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Nové heslo
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Potvrdit heslo
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Ukládám...' : 'Změnit heslo'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zpět na přihlášení
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zapomenuté heslo</DialogTitle>
            <DialogDescription>
              Zadejte svůj email a pošleme vám odkaz pro reset hesla.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="tvuj@email.cz"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Odesílám...' : 'Odeslat reset email'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Zapomněli jste heslo?
                  </button>
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Přihlašuji...' : 'Přihlásit se'}
                </Button>

                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    nebo
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full flex items-center gap-3"
                  onClick={async () => {
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/`,
                      },
                    });
                    if (error) {
                      toast.error('Chyba při přihlášení přes Google');
                    }
                  }}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Přihlásit přes Google
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

                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    nebo
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full flex items-center gap-3"
                  onClick={async () => {
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/`,
                      },
                    });
                    if (error) {
                      toast.error('Chyba při registraci přes Google');
                    }
                  }}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Registrovat přes Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
