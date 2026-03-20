import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Sparkles, Gift, Lock, Unlock, Calendar, Plus, CheckCircle, 
  XCircle, Trophy, Loader2, Star, ShoppingBag, Settings, Puzzle
} from 'lucide-react';

interface Season {
  id: string;
  title: string;
  description: string | null;
  is_visible: boolean;
  is_active: boolean;
  created_at: string;
}

interface Riddle {
  id: string;
  season_id: string;
  title: string;
  question: string;
  answer: string;
  hint: string | null;
  scheduled_date: string;
  reward_item_id: string | null;
  reward_discount_percent: number | null;
  is_published: boolean;
  created_at: string;
}

interface Attempt {
  riddle_id: string;
  is_correct: boolean;
}

interface Reward {
  id: string;
  season_id: string;
  title: string;
  description: string | null;
  required_correct_count: number;
  reward_type: string;
  reward_value: number;
}

interface RewardClaim {
  reward_id: string;
}

export default function Sezona() {
  const { user } = useAuth();
  const [season, setSeason] = useState<Season | null>(null);
  const [riddles, setRiddles] = useState<Riddle[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    checkRole();
    fetchData();
  }, [user]);

  const checkRole = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = data?.map(r => r.role as string) || [];
    setIsOrganizer(roles.some(r => r === 'organizer' || r === 'helper'));
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch active season
    const { data: seasons } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .limit(1);
    
    const activeSeason = seasons?.[0] || null;
    setSeason(activeSeason);

    if (activeSeason) {
      // Fetch riddles
      const { data: riddlesData } = await supabase
        .from('season_riddles')
        .select('*')
        .eq('season_id', activeSeason.id)
        .order('scheduled_date', { ascending: true });
      
      setRiddles(riddlesData || []);

      // Fetch rewards
      const { data: rewardsData } = await supabase
        .from('season_rewards')
        .select('*')
        .eq('season_id', activeSeason.id)
        .order('required_correct_count', { ascending: true });
      
      setRewards(rewardsData || []);

      if (user) {
        // Fetch user attempts
        const riddleIds = (riddlesData || []).map(r => r.id);
        if (riddleIds.length > 0) {
          const { data: attemptsData } = await supabase
            .from('season_riddle_attempts')
            .select('riddle_id, is_correct')
            .eq('user_id', user.id)
            .in('riddle_id', riddleIds);
          setAttempts(attemptsData || []);
        }

        // Fetch claims
        const rewardIds = (rewardsData || []).map(r => r.id);
        if (rewardIds.length > 0) {
          const { data: claimsData } = await supabase
            .from('season_reward_claims')
            .select('reward_id')
            .eq('user_id', user.id)
            .in('reward_id', rewardIds);
          setClaims(claimsData || []);
        }
      }
    }

    setLoading(false);
  };

  const submitAnswer = async (riddle: Riddle) => {
    if (!user) return toast.error('Musíš být přihlášený.');
    
    const answer = answerInputs[riddle.id]?.trim();
    if (!answer) return toast.error('Napiš odpověď.');

    setSubmitting(riddle.id);
    const isCorrect = answer.toLowerCase() === riddle.answer.toLowerCase();

    const { error } = await supabase.from('season_riddle_attempts').insert({
      riddle_id: riddle.id,
      user_id: user.id,
      answer,
      is_correct: isCorrect,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Už jsi na tuto hádanku odpověděl/a.');
      } else {
        toast.error('Chyba při odesílání odpovědi.');
      }
    } else {
      if (isCorrect) {
        toast.success('🎉 Správně! Získáváš odměnu!');
      } else {
        toast.error('Špatná odpověď. Zkus to příště!');
      }
      setAttempts(prev => [...prev, { riddle_id: riddle.id, is_correct: isCorrect }]);
      setAnswerInputs(prev => ({ ...prev, [riddle.id]: '' }));
    }
    setSubmitting(null);
  };

  const claimReward = async (reward: Reward) => {
    if (!user) return;

    const { error } = await supabase.from('season_reward_claims').insert({
      reward_id: reward.id,
      user_id: user.id,
    });

    if (error) {
      toast.error('Nepodařilo se vyzvednout odměnu.');
      return;
    }

    if (reward.reward_type === 'points' && reward.reward_value > 0) {
      await supabase.rpc('update_points', { _user_id: user.id, _amount: reward.reward_value });
    }

    setClaims(prev => [...prev, { reward_id: reward.id }]);
    toast.success(`🏆 Odměna "${reward.title}" vyzvedunta!`);
  };

  const correctCount = attempts.filter(a => a.is_correct).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-lg mx-auto text-center shadow-card">
          <CardContent className="pt-8 pb-8">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-display font-bold mb-2">Žádná aktivní sezóna</h2>
            <p className="text-muted-foreground">Momentálně neprobíhá žádná sezóna. Sleduj novinky!</p>
          </CardContent>
        </Card>
        {isOrganizer && <SeasonAdmin onRefresh={fetchData} />}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Season Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-display font-bold">{season.title}</h1>
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        {season.description && (
          <p className="text-muted-foreground max-w-xl mx-auto">{season.description}</p>
        )}
        {user && (
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            {correctCount} správných odpovědí
          </Badge>
        )}
      </div>

      {/* Rewards Progress */}
      {rewards.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Odměny za milníky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rewards.map(reward => {
                const unlocked = correctCount >= reward.required_correct_count;
                const claimed = claims.some(c => c.reward_id === reward.id);
                return (
                  <div key={reward.id} className={`p-4 rounded-xl border transition-all ${
                    unlocked ? 'bg-success/5 border-success/30' : 'bg-muted/50 border-border'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {unlocked ? <Unlock className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                      <span className="font-semibold text-sm">{reward.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {reward.required_correct_count}× správně → {reward.reward_type === 'points' ? `${reward.reward_value} bodů` : reward.description || 'trofej'}
                    </p>
                    {unlocked && !claimed && user && (
                      <Button size="sm" variant="default" onClick={() => claimReward(reward)} className="w-full active:scale-[0.97]">
                        <Gift className="w-3 h-3 mr-1" /> Vyzvednout
                      </Button>
                    )}
                    {claimed && (
                      <Badge className="bg-success/20 text-success border-0">✓ Vyzvedunto</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riddles */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Puzzle className="w-5 h-5 text-primary" />
          Hádanky
        </h2>
        {riddles.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              Zatím žádné hádanky. Zkus to později!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {riddles.map(riddle => {
              const attempt = attempts.find(a => a.riddle_id === riddle.id);
              const today = new Date().toISOString().split('T')[0];
              const isToday = riddle.scheduled_date === today;
              const isPast = riddle.scheduled_date < today;

              return (
                <Card key={riddle.id} className={`shadow-card transition-all ${isToday ? 'ring-2 ring-primary/30' : ''}`}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(riddle.scheduled_date + 'T00:00:00'), 'd. MMMM', { locale: cs })}
                          </Badge>
                          {isToday && <Badge className="bg-primary">Dnes!</Badge>}
                          {riddle.reward_discount_percent && riddle.reward_discount_percent > 0 && (
                            <Badge variant="outline" className="gap-1 text-success border-success/30">
                              <ShoppingBag className="w-3 h-3" />
                              -{riddle.reward_discount_percent}% sleva
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold">{riddle.title}</h3>
                        <p className="text-muted-foreground text-sm">{riddle.question}</p>
                        {riddle.hint && (
                          <p className="text-xs text-muted-foreground italic">💡 Nápověda: {riddle.hint}</p>
                        )}
                      </div>

                      <div className="sm:w-56 shrink-0">
                        {attempt ? (
                          attempt.is_correct ? (
                            <div className="flex items-center gap-2 text-success bg-success/10 px-3 py-2 rounded-lg">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Správně!</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Špatně</span>
                            </div>
                          )
                        ) : (isToday || isPast) && user ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Tvá odpověď..."
                              value={answerInputs[riddle.id] || ''}
                              onChange={e => setAnswerInputs(p => ({ ...p, [riddle.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && submitAnswer(riddle)}
                              className="text-sm"
                            />
                            <Button 
                              size="icon" 
                              onClick={() => submitAnswer(riddle)}
                              disabled={submitting === riddle.id}
                              className="shrink-0 active:scale-[0.97]"
                            >
                              {submitting === riddle.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center">Ještě to nezačalo</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Section */}
      {isOrganizer && <SeasonAdmin season={season} onRefresh={fetchData} />}
    </div>
  );
}

// --- Admin Section ---
function SeasonAdmin({ season, onRefresh }: { season?: Season | null; onRefresh: () => void }) {
  const { user } = useAuth();
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);
  const [showNewSeason, setShowNewSeason] = useState(false);
  const [showNewRiddle, setShowNewRiddle] = useState(false);
  const [showNewReward, setShowNewReward] = useState(false);
  const [newSeason, setNewSeason] = useState({ title: '', description: '' });
  const [newRiddle, setNewRiddle] = useState({ title: '', question: '', answer: '', hint: '', scheduled_date: '', reward_discount_percent: 0 });
  const [newReward, setNewReward] = useState({ title: '', description: '', required_correct_count: 1, reward_type: 'points', reward_value: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAllSeasons(); }, []);

  const fetchAllSeasons = async () => {
    const { data } = await supabase.from('seasons').select('*').order('created_at', { ascending: false });
    setAllSeasons(data || []);
  };

  const createSeason = async () => {
    if (!user || !newSeason.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('seasons').insert({
      title: newSeason.title,
      description: newSeason.description || null,
      created_by: user.id,
    });
    if (error) toast.error('Chyba při vytváření sezóny.');
    else { toast.success('Sezóna vytvořena!'); setShowNewSeason(false); setNewSeason({ title: '', description: '' }); fetchAllSeasons(); onRefresh(); }
    setSaving(false);
  };

  const toggleSeason = async (s: Season, field: 'is_visible' | 'is_active') => {
    const update: Record<string, boolean> = { [field]: !s[field] };
    // If activating, deactivate others
    if (field === 'is_active' && !s.is_active) {
      await supabase.from('seasons').update({ is_active: false }).neq('id', s.id);
    }
    await supabase.from('seasons').update(update).eq('id', s.id);
    fetchAllSeasons();
    onRefresh();
  };

  const createRiddle = async () => {
    if (!user || !season || !newRiddle.title.trim() || !newRiddle.question.trim() || !newRiddle.answer.trim() || !newRiddle.scheduled_date) return;
    setSaving(true);
    const { error } = await supabase.from('season_riddles').insert({
      season_id: season.id,
      title: newRiddle.title,
      question: newRiddle.question,
      answer: newRiddle.answer,
      hint: newRiddle.hint || null,
      scheduled_date: newRiddle.scheduled_date,
      reward_discount_percent: newRiddle.reward_discount_percent,
      is_published: true,
      created_by: user.id,
    });
    if (error) toast.error('Chyba při vytváření hádanky.');
    else { toast.success('Hádanka přidána!'); setShowNewRiddle(false); setNewRiddle({ title: '', question: '', answer: '', hint: '', scheduled_date: '', reward_discount_percent: 0 }); onRefresh(); }
    setSaving(false);
  };

  const createReward = async () => {
    if (!season || !newReward.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('season_rewards').insert({
      season_id: season.id,
      ...newReward,
      description: newReward.description || null,
    });
    if (error) toast.error('Chyba při vytváření odměny.');
    else { toast.success('Odměna přidána!'); setShowNewReward(false); setNewReward({ title: '', description: '', required_correct_count: 1, reward_type: 'points', reward_value: 0 }); onRefresh(); }
    setSaving(false);
  };

  return (
    <Card className="shadow-card border-primary/20 mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Správa sezón (organizátor)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="seasons">
          <TabsList>
            <TabsTrigger value="seasons">Sezóny</TabsTrigger>
            {season && <TabsTrigger value="riddles">Přidat hádanku</TabsTrigger>}
            {season && <TabsTrigger value="rewards">Přidat odměnu</TabsTrigger>}
          </TabsList>

          <TabsContent value="seasons" className="space-y-4 mt-4">
            <Button onClick={() => setShowNewSeason(true)} size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Nová sezóna
            </Button>

            {showNewSeason && (
              <Card className="p-4 space-y-3">
                <Input placeholder="Název sezóny (např. Apríl)" value={newSeason.title} onChange={e => setNewSeason(p => ({ ...p, title: e.target.value }))} />
                <Textarea placeholder="Popis (volitelný)" value={newSeason.description} onChange={e => setNewSeason(p => ({ ...p, description: e.target.value }))} />
                <div className="flex gap-2">
                  <Button onClick={createSeason} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vytvořit'}</Button>
                  <Button variant="ghost" onClick={() => setShowNewSeason(false)}>Zrušit</Button>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              {allSeasons.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <span className="font-medium">{s.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {format(new Date(s.created_at), 'dd.MM.yyyy', { locale: cs })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs">
                      <Switch checked={s.is_visible} onCheckedChange={() => toggleSeason(s, 'is_visible')} />
                      Viditelná
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <Switch checked={s.is_active} onCheckedChange={() => toggleSeason(s, 'is_active')} />
                      Aktivní
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {season && (
            <TabsContent value="riddles" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Input placeholder="Název hádanky" value={newRiddle.title} onChange={e => setNewRiddle(p => ({ ...p, title: e.target.value }))} />
                <Textarea placeholder="Otázka / zadání" value={newRiddle.question} onChange={e => setNewRiddle(p => ({ ...p, question: e.target.value }))} />
                <Input placeholder="Správná odpověď" value={newRiddle.answer} onChange={e => setNewRiddle(p => ({ ...p, answer: e.target.value }))} />
                <Input placeholder="Nápověda (volitelná)" value={newRiddle.hint} onChange={e => setNewRiddle(p => ({ ...p, hint: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Datum zobrazení</Label>
                    <Input type="date" value={newRiddle.scheduled_date} onChange={e => setNewRiddle(p => ({ ...p, scheduled_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Sleva na dárek (%)</Label>
                    <Input type="number" min={0} max={100} value={newRiddle.reward_discount_percent} onChange={e => setNewRiddle(p => ({ ...p, reward_discount_percent: Number(e.target.value) }))} />
                  </div>
                </div>
                <Button onClick={createRiddle} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Přidat hádanku'}</Button>
              </div>
            </TabsContent>
          )}

          {season && (
            <TabsContent value="rewards" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Input placeholder="Název odměny" value={newReward.title} onChange={e => setNewReward(p => ({ ...p, title: e.target.value }))} />
                <Input placeholder="Popis" value={newReward.description} onChange={e => setNewReward(p => ({ ...p, description: e.target.value }))} />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Potřeba správných</Label>
                    <Input type="number" min={1} value={newReward.required_correct_count} onChange={e => setNewReward(p => ({ ...p, required_correct_count: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Typ odměny</Label>
                    <Select value={newReward.reward_type} onValueChange={v => setNewReward(p => ({ ...p, reward_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">Body</SelectItem>
                        <SelectItem value="trophy">Trofej</SelectItem>
                        <SelectItem value="badge">Odznak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Hodnota</Label>
                    <Input type="number" min={0} value={newReward.reward_value} onChange={e => setNewReward(p => ({ ...p, reward_value: Number(e.target.value) }))} />
                  </div>
                </div>
                <Button onClick={createReward} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Přidat odměnu'}</Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
