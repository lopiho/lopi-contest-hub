import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { calculateRatingStats, getRatingQuality } from '@/lib/points';
import RatingDisplay from '@/components/RatingDisplay';
import { 
  Shield, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Star,
  Loader2,
  Coins,
  Clock,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  HelpCircle,
  Plus,
  Image as ImageIcon,
  Trophy,
  Users
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Article {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'rated' | 'published';
  points_awarded: number;
  created_at: string;
  author_id: string;
  author_username?: string;
  article_ratings?: {
    rating: number;
    user_id: string;
  }[];
}

interface GuessingGame {
  id: string;
  title: string;
  question: string;
  image_url: string | null;
  status: 'active' | 'closed' | 'resolved';
  correct_answer: string | null;
  winner_id: string | null;
  points_awarded: number;
  created_at: string;
  tips?: {
    id: string;
    tip: string;
    user_id: string;
    is_winner: boolean;
    username?: string;
  }[];
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [games, setGames] = useState<GuessingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsToAward, setPointsToAward] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedArticleForPublish, setSelectedArticleForPublish] = useState<Article | null>(null);
  
  // New game form
  const [newGameDialogOpen, setNewGameDialogOpen] = useState(false);
  const [newGame, setNewGame] = useState({ title: '', question: '', imageFile: null as File | null });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Resolve game
  const [selectedGameForResolve, setSelectedGameForResolve] = useState<GuessingGame | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [gamePoints, setGamePoints] = useState('10');

  useEffect(() => {
    if (user) {
      checkRole();
    }
  }, [user]);

  const checkRole = async () => {
    setCheckingRole(true);
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id);
    
    const hasOrgRole = data?.some(r => r.role === 'organizer' || r.role === 'helper');
    setIsOrganizer(hasOrgRole || false);
    
    if (hasOrgRole) {
      fetchData();
    }
    setCheckingRole(false);
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchArticles(), fetchGames()]);
    setLoading(false);
  };

  const fetchArticles = async () => {
    const { data: allArticles } = await supabase
      .from('articles')
      .select(`*, article_ratings(rating, user_id)`)
      .order('created_at', { ascending: false });

    const authorIds = [...new Set((allArticles || []).map(a => a.author_id))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', authorIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    const mappedArticles = (allArticles || []).map(a => ({
      ...a,
      author_username: profileMap.get(a.author_id) || 'Neznámý'
    })) as Article[];

    setArticles(mappedArticles);
  };

  const fetchGames = async () => {
    const { data: gamesData } = await supabase
      .from('guessing_games')
      .select('*')
      .order('created_at', { ascending: false });

    if (!gamesData) {
      setGames([]);
      return;
    }

    // Fetch tips for all games
    const gameIds = gamesData.map(g => g.id);
    const { data: tipsData } = await supabase
      .from('guessing_tips')
      .select('*')
      .in('game_id', gameIds);

    // Fetch usernames for tip authors
    const tipUserIds = [...new Set((tipsData || []).map(t => t.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', tipUserIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    const mappedGames = gamesData.map(game => ({
      ...game,
      tips: (tipsData || [])
        .filter(t => t.game_id === game.id)
        .map(t => ({
          ...t,
          username: profileMap.get(t.user_id) || 'Neznámý'
        }))
    })) as GuessingGame[];

    setGames(mappedGames);
  };

  // Article handlers
  const handleApprove = async (articleId: string) => {
    setProcessing(true);
    const { error } = await supabase.from('articles').update({ status: 'approved' }).eq('id', articleId);
    if (error) toast.error('Chyba při schvalování');
    else { toast.success('Článek schválen!'); fetchArticles(); }
    setProcessing(false);
  };

  const handleReject = async (articleId: string) => {
    setProcessing(true);
    const { error } = await supabase.from('articles').update({ status: 'rejected' }).eq('id', articleId);
    if (error) toast.error('Chyba při zamítání');
    else { toast.success('Článek zamítnut'); fetchArticles(); }
    setProcessing(false);
  };

  const handlePublishWithPoints = async () => {
    if (!selectedArticleForPublish) return;
    const points = parseInt(pointsToAward);
    if (isNaN(points) || points < 0) { toast.error('Zadej platný počet bodů'); return; }

    setProcessing(true);
    const { error } = await supabase.from('articles')
      .update({ status: 'published', points_awarded: points })
      .eq('id', selectedArticleForPublish.id);

    if (error) { toast.error('Chyba při publikování'); setProcessing(false); return; }

    if (points > 0) {
      const { data: profile } = await supabase.from('profiles')
        .select('points').eq('id', selectedArticleForPublish.author_id).maybeSingle();
      if (profile) {
        await supabase.from('profiles')
          .update({ points: profile.points + points })
          .eq('id', selectedArticleForPublish.author_id);
      }
    }

    toast.success(`Článek publikován! +${points} bodů`);
    setSelectedArticleForPublish(null);
    setPointsToAward('');
    fetchArticles();
    setProcessing(false);
  };

  // Game handlers
  const handleCreateGame = async () => {
    if (!newGame.title.trim() || !newGame.question.trim()) {
      toast.error('Vyplň název a otázku');
      return;
    }

    setProcessing(true);
    let imageUrl = null;

    if (newGame.imageFile) {
      setUploadingImage(true);
      const fileName = `${Date.now()}-${newGame.imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tipovacky')
        .upload(fileName, newGame.imageFile);

      if (uploadError) {
        toast.error('Chyba při nahrávání obrázku');
        setUploadingImage(false);
        setProcessing(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('tipovacky').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
      setUploadingImage(false);
    }

    const { error } = await supabase.from('guessing_games').insert({
      created_by: user?.id,
      title: newGame.title.trim(),
      question: newGame.question.trim(),
      image_url: imageUrl,
    });

    if (error) {
      toast.error('Chyba při vytváření tipovačky');
    } else {
      toast.success('Tipovačka vytvořena!');
      setNewGame({ title: '', question: '', imageFile: null });
      setNewGameDialogOpen(false);
      fetchGames();
    }
    setProcessing(false);
  };

  const handleResolveGame = async () => {
    if (!selectedGameForResolve || !selectedWinnerId) {
      toast.error('Vyber vítěze');
      return;
    }

    const points = parseInt(gamePoints);
    if (isNaN(points) || points < 0) { toast.error('Zadej platný počet bodů'); return; }

    setProcessing(true);

    // Update game
    const { error: gameError } = await supabase.from('guessing_games')
      .update({
        status: 'resolved',
        correct_answer: correctAnswer.trim() || null,
        winner_id: selectedWinnerId,
        points_awarded: points,
        closed_at: new Date().toISOString()
      })
      .eq('id', selectedGameForResolve.id);

    if (gameError) { toast.error('Chyba při ukončování'); setProcessing(false); return; }

    // Mark winner tip
    await supabase.from('guessing_tips')
      .update({ is_winner: true })
      .eq('game_id', selectedGameForResolve.id)
      .eq('user_id', selectedWinnerId);

    // Award points
    if (points > 0) {
      const { data: profile } = await supabase.from('profiles')
        .select('points').eq('id', selectedWinnerId).maybeSingle();
      if (profile) {
        await supabase.from('profiles')
          .update({ points: profile.points + points })
          .eq('id', selectedWinnerId);
      }
    }

    toast.success(`Tipovačka ukončena! Vítěz získal ${points} bodů`);
    setSelectedGameForResolve(null);
    setCorrectAnswer('');
    setSelectedWinnerId(null);
    setGamePoints('10');
    fetchGames();
    setProcessing(false);
  };

  const pendingArticles = articles.filter(a => a.status === 'pending');
  const approvedArticles = articles.filter(a => a.status === 'approved' || a.status === 'rated');
  const activeGames = games.filter(g => g.status === 'active');

  if (authLoading || checkingRole) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!isOrganizer) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Card className="max-w-md text-center"><CardContent className="pt-8">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Přístup odepřen</h2>
          <p className="text-muted-foreground">Pouze pro organizátory.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center shadow-card">
                <Shield className="w-6 h-6 text-secondary-foreground" />
              </div>
              Admin Panel
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-card"><CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{pendingArticles.length}</p>
            <p className="text-sm text-muted-foreground">Články ke schválení</p>
          </CardContent></Card>
          <Card className="shadow-card"><CardContent className="pt-6 text-center">
            <Star className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{approvedArticles.length}</p>
            <p className="text-sm text-muted-foreground">K publikaci</p>
          </CardContent></Card>
          <Card className="shadow-card"><CardContent className="pt-6 text-center">
            <HelpCircle className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">{activeGames.length}</p>
            <p className="text-sm text-muted-foreground">Aktivní tipovačky</p>
          </CardContent></Card>
          <Card className="shadow-card"><CardContent className="pt-6 text-center">
            <Coins className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{articles.filter(a => a.status === 'published').reduce((s, a) => s + a.points_awarded, 0) + games.filter(g => g.status === 'resolved').reduce((s, g) => s + g.points_awarded, 0)}</p>
            <p className="text-sm text-muted-foreground">Rozdáno bodů</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="articles" className="gap-2"><FileText className="w-4 h-4" />Články</TabsTrigger>
            <TabsTrigger value="tipovacky" className="gap-2"><HelpCircle className="w-4 h-4" />Tipovačky</TabsTrigger>
          </TabsList>

          {/* Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="pending">Ke schválení ({pendingArticles.length})</TabsTrigger>
                <TabsTrigger value="approved">K publikaci ({approvedArticles.length})</TabsTrigger>
                <TabsTrigger value="published">Publikováno</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4 mt-4">
                {pendingArticles.length === 0 ? (
                  <Card className="text-center py-12"><CardContent><CheckCircle className="w-12 h-12 text-success mx-auto mb-4" /><p className="text-muted-foreground">Žádné články ke schválení</p></CardContent></Card>
                ) : (
                  <div className="space-y-4">
                    {pendingArticles.map((article) => (
                      <Card key={article.id} className="shadow-card">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div><CardTitle>{article.title}</CardTitle><CardDescription>@{article.author_username}</CardDescription></div>
                            <Badge className="bg-yellow-500">Čeká</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto"><p className="text-sm whitespace-pre-wrap">{article.content}</p></div>
                          <div className="flex gap-2">
                            <Button variant="success" className="flex-1" onClick={() => handleApprove(article.id)} disabled={processing}><CheckCircle className="w-4 h-4 mr-2" />Schválit</Button>
                            <Button variant="destructive" className="flex-1" onClick={() => handleReject(article.id)} disabled={processing}><XCircle className="w-4 h-4 mr-2" />Zamítnout</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4 mt-4">
                {approvedArticles.length === 0 ? (
                  <Card className="text-center py-12"><CardContent><FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Žádné články k publikaci</p></CardContent></Card>
                ) : (
                  <div className="space-y-4">
                    {approvedArticles.map((article) => {
                      const stats = calculateRatingStats(article.article_ratings || []);
                      return (
                        <Card key={article.id} className="shadow-card">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                              <div><CardTitle>{article.title}</CardTitle><CardDescription>@{article.author_username}</CardDescription></div>
                              <Badge className="bg-blue-500">K hodnocení</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4 p-4 bg-card border rounded-lg">
                              <RatingDisplay stats={stats} showDistribution={stats.totalRatings > 0} />
                              <div className="flex flex-col justify-center">
                                <Badge variant="secondary" className="bg-success/10 text-success w-fit">Doporučeno: {stats.suggestedPoints} bodů</Badge>
                              </div>
                            </div>
                            <Button variant="hero" className="w-full" onClick={() => { setSelectedArticleForPublish(article); setPointsToAward(stats.suggestedPoints.toString()); }}><Coins className="w-4 h-4 mr-2" />Publikovat</Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="published" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {articles.filter(a => a.status === 'published').map((article) => (
                    <Card key={article.id} className="shadow-card">
                      <CardHeader>
                        <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                        <CardDescription>@{article.author_username}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge className="bg-success/10 text-success">+{article.points_awarded} bodů</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tipovačky Tab */}
          <TabsContent value="tipovacky" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold">Správa tipovačk</h2>
              <Dialog open={newGameDialogOpen} onOpenChange={setNewGameDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="gap-2"><Plus className="w-4 h-4" />Nová tipovačka</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Vytvořit tipovačku</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Název</Label>
                      <Input placeholder="Např. Tipni věk" value={newGame.title} onChange={(e) => setNewGame({ ...newGame, title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Otázka</Label>
                      <Textarea placeholder="Kolik let je osobě na fotce?" value={newGame.question} onChange={(e) => setNewGame({ ...newGame, question: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Obrázek (volitelné)</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setNewGame({ ...newGame, imageFile: e.target.files?.[0] || null })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setNewGameDialogOpen(false)}>Zrušit</Button>
                    <Button variant="hero" onClick={handleCreateGame} disabled={processing}>{processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}<span className="ml-2">Vytvořit</span></Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => (
                <Card key={game.id} className={`shadow-card ${game.status === 'resolved' ? 'opacity-70' : ''}`}>
                  {game.image_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img src={game.image_url} alt={game.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{game.title}</CardTitle>
                      <Badge className={game.status === 'active' ? 'bg-accent' : 'bg-success'}>{game.status === 'active' ? 'Aktivní' : 'Ukončeno'}</Badge>
                    </div>
                    <CardDescription>{game.question}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {game.tips?.length || 0} tipů
                    </div>

                    {game.status === 'active' && (
                      <Button variant="outline" className="w-full" onClick={() => { setSelectedGameForResolve(game); setGamePoints('10'); }}>
                        <Trophy className="w-4 h-4 mr-2" />Ukončit a vybrat vítěze
                      </Button>
                    )}

                    {game.status === 'resolved' && game.correct_answer && (
                      <div className="p-2 bg-success/10 rounded text-sm">
                        <span className="text-muted-foreground">Odpověď:</span> <strong>{game.correct_answer}</strong>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Publish Article Dialog */}
        <Dialog open={!!selectedArticleForPublish} onOpenChange={(open) => !open && setSelectedArticleForPublish(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Publikovat článek</DialogTitle></DialogHeader>
            {selectedArticleForPublish && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedArticleForPublish.title}</p>
                  <p className="text-sm text-muted-foreground">@{selectedArticleForPublish.author_username}</p>
                </div>
                <div className="space-y-2">
                  <Label>Bodová odměna</Label>
                  <Input type="number" min="0" value={pointsToAward} onChange={(e) => setPointsToAward(e.target.value)} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedArticleForPublish(null)}>Zrušit</Button>
              <Button variant="hero" onClick={handlePublishWithPoints} disabled={processing}>{processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}<span className="ml-2">Publikovat</span></Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve Game Dialog */}
        <Dialog open={!!selectedGameForResolve} onOpenChange={(open) => !open && setSelectedGameForResolve(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />Ukončit tipovačku</DialogTitle></DialogHeader>
            {selectedGameForResolve && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedGameForResolve.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedGameForResolve.question}</p>
                </div>

                <div className="space-y-2">
                  <Label>Správná odpověď (volitelné)</Label>
                  <Input placeholder="Např. 42" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Vyber vítěze</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedGameForResolve.tips?.map((tip) => (
                      <div 
                        key={tip.id} 
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedWinnerId === tip.user_id ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}
                        onClick={() => setSelectedWinnerId(tip.user_id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">@{tip.username}</span>
                          <Badge variant="secondary">{tip.tip}</Badge>
                        </div>
                      </div>
                    ))}
                    {(!selectedGameForResolve.tips || selectedGameForResolve.tips.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">Žádné tipy</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Body pro vítěze</Label>
                  <Input type="number" min="0" value={gamePoints} onChange={(e) => setGamePoints(e.target.value)} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedGameForResolve(null)}>Zrušit</Button>
              <Button variant="hero" onClick={handleResolveGame} disabled={processing || !selectedWinnerId}>{processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}<span className="ml-2">Ukončit a odměnit</span></Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
