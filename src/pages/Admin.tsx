import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  TrendingUp
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

const statusConfig = {
  pending: { label: 'Čeká na schválení', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Schváleno', color: 'bg-blue-500', icon: CheckCircle },
  rejected: { label: 'Zamítnuto', color: 'bg-destructive', icon: XCircle },
  rated: { label: 'Ohodnoceno', color: 'bg-accent', icon: Star },
  published: { label: 'Publikováno', color: 'bg-success', icon: CheckCircle },
};

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsToAward, setPointsToAward] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedArticleForPublish, setSelectedArticleForPublish] = useState<Article | null>(null);

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
      fetchArticles();
    }
    setCheckingRole(false);
  };

  const fetchArticles = async () => {
    setLoading(true);
    
    const { data: allArticles } = await supabase
      .from('articles')
      .select(`
        *,
        article_ratings(rating, user_id)
      `)
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
    setLoading(false);
  };

  const handleApprove = async (articleId: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from('articles')
      .update({ status: 'approved' })
      .eq('id', articleId);

    if (error) {
      toast.error('Chyba při schvalování');
    } else {
      toast.success('Článek schválen k hodnocení!');
      fetchArticles();
    }
    setProcessing(false);
  };

  const handleReject = async (articleId: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from('articles')
      .update({ status: 'rejected' })
      .eq('id', articleId);

    if (error) {
      toast.error('Chyba při zamítání');
    } else {
      toast.success('Článek zamítnut');
      fetchArticles();
    }
    setProcessing(false);
  };

  const handlePublishWithPoints = async () => {
    if (!selectedArticleForPublish) return;
    
    const points = parseInt(pointsToAward);
    if (isNaN(points) || points < 0) {
      toast.error('Zadej platný počet bodů');
      return;
    }

    setProcessing(true);

    const { error: articleError } = await supabase
      .from('articles')
      .update({ 
        status: 'published',
        points_awarded: points 
      })
      .eq('id', selectedArticleForPublish.id);

    if (articleError) {
      toast.error('Chyba při publikování');
      setProcessing(false);
      return;
    }

    if (points > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', selectedArticleForPublish.author_id)
        .maybeSingle();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ points: profile.points + points })
          .eq('id', selectedArticleForPublish.author_id);
      }
    }

    toast.success(`Článek publikován! ${points > 0 ? `+${points} bodů autorovi` : ''}`);
    setSelectedArticleForPublish(null);
    setPointsToAward('');
    fetchArticles();
    setProcessing(false);
  };

  const openPublishDialog = (article: Article) => {
    const stats = calculateRatingStats(article.article_ratings || []);
    setSelectedArticleForPublish(article);
    setPointsToAward(stats.suggestedPoints.toString());
  };

  const pendingArticles = articles.filter(a => a.status === 'pending');
  const approvedArticles = articles.filter(a => a.status === 'approved' || a.status === 'rated');
  const publishedArticles = articles.filter(a => a.status === 'published');

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isOrganizer) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2">Přístup odepřen</h2>
            <p className="text-muted-foreground">
              Tato stránka je pouze pro organizátory a pomocníčky.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center shadow-card">
              <Shield className="w-6 h-6 text-secondary-foreground" />
            </div>
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-2">
            Spravuj články, schvaluj příspěvky a přiděluj body.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{pendingArticles.length}</p>
              <p className="text-sm text-muted-foreground">Čeká na schválení</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <Star className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{approvedArticles.length}</p>
              <p className="text-sm text-muted-foreground">K hodnocení</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold">{publishedArticles.length}</p>
              <p className="text-sm text-muted-foreground">Publikováno</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <Coins className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {publishedArticles.reduce((sum, a) => sum + a.points_awarded, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Rozdáno bodů</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Ke schválení ({pendingArticles.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <Star className="w-4 h-4" />
              K publikaci ({approvedArticles.length})
            </TabsTrigger>
            <TabsTrigger value="published" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Publikováno
            </TabsTrigger>
          </TabsList>

          {/* Pending Articles */}
          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pendingArticles.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                  <p className="text-muted-foreground">Žádné články ke schválení</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingArticles.map((article) => (
                  <Card key={article.id} className="shadow-card">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">{article.title}</CardTitle>
                          <CardDescription>
                            od @{article.author_username} • {new Date(article.created_at).toLocaleDateString('cs-CZ')}
                          </CardDescription>
                        </div>
                        <Badge className="bg-yellow-500 text-primary-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          Čeká
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap">{article.content}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="success" 
                          className="flex-1 gap-2"
                          onClick={() => handleApprove(article.id)}
                          disabled={processing}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Schválit
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="flex-1 gap-2"
                          onClick={() => handleReject(article.id)}
                          disabled={processing}
                        >
                          <XCircle className="w-4 h-4" />
                          Zamítnout
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Approved Articles - Ready for Publishing */}
          <TabsContent value="approved" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : approvedArticles.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Žádné články k publikaci</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedArticles.map((article) => {
                  const stats = calculateRatingStats(article.article_ratings || []);
                  const quality = getRatingQuality(stats.averageRating);

                  return (
                    <Card key={article.id} className="shadow-card">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-lg">{article.title}</CardTitle>
                            <CardDescription>
                              od @{article.author_username} • {new Date(article.created_at).toLocaleDateString('cs-CZ')}
                            </CardDescription>
                          </div>
                          <Badge className="bg-blue-500 text-primary-foreground">
                            K hodnocení
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-muted/50 rounded-lg p-4 max-h-32 overflow-y-auto">
                          <p className="text-sm whitespace-pre-wrap line-clamp-4">{article.content}</p>
                        </div>
                        
                        {/* Rating Stats */}
                        <div className="grid md:grid-cols-2 gap-4 p-4 bg-card border rounded-lg">
                          <div>
                            <RatingDisplay stats={stats} showDistribution={stats.totalRatings > 0} />
                          </div>
                          <div className="flex flex-col justify-center space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Doporučené body:</span>
                              <Badge variant="secondary" className="bg-success/10 text-success font-bold">
                                {stats.suggestedPoints} bodů
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Výpočet: 5 (základ) + {stats.averageRating ? Math.round((stats.averageRating - 5) * 3) : 0} (hodnocení) + {Math.min(10, Math.floor(stats.totalRatings / 2))} (účast)
                            </p>
                          </div>
                        </div>
                        
                        <Button 
                          variant="hero" 
                          className="w-full gap-2"
                          onClick={() => openPublishDialog(article)}
                        >
                          <Coins className="w-4 h-4" />
                          Publikovat a přidělit body
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Published Articles */}
          <TabsContent value="published" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : publishedArticles.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Žádné publikované články</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publishedArticles.map((article) => {
                  const stats = calculateRatingStats(article.article_ratings || []);

                  return (
                    <Card key={article.id} className="shadow-card">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                          <Badge className="bg-success text-success-foreground shrink-0">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Publikováno
                          </Badge>
                        </div>
                        <CardDescription>
                          od @{article.author_username}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <RatingDisplay stats={stats} compact />
                          {article.points_awarded > 0 && (
                            <Badge variant="secondary" className="bg-success/10 text-success">
                              +{article.points_awarded} bodů
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Publish Dialog */}
        <Dialog open={!!selectedArticleForPublish} onOpenChange={(open) => !open && setSelectedArticleForPublish(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Publikovat článek
              </DialogTitle>
            </DialogHeader>
            {selectedArticleForPublish && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedArticleForPublish.title}</p>
                  <p className="text-sm text-muted-foreground">od @{selectedArticleForPublish.author_username}</p>
                </div>
                
                {/* Rating summary */}
                <div className="p-4 border rounded-lg">
                  <RatingDisplay 
                    stats={calculateRatingStats(selectedArticleForPublish.article_ratings || [])} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points" className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    Bodová odměna
                  </Label>
                  <Input
                    id="points"
                    type="number"
                    placeholder="0"
                    min="0"
                    value={pointsToAward}
                    onChange={(e) => setPointsToAward(e.target.value)}
                    className="text-lg font-bold"
                  />
                  <p className="text-xs text-muted-foreground">
                    Doporučeno: {calculateRatingStats(selectedArticleForPublish.article_ratings || []).suggestedPoints} bodů
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedArticleForPublish(null)}>
                Zrušit
              </Button>
              <Button 
                variant="hero" 
                onClick={handlePublishWithPoints}
                disabled={processing}
                className="gap-2"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Publikovat (+{pointsToAward || 0} bodů)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
