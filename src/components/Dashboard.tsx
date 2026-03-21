import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Leaderboard from '@/components/Leaderboard';
import SpotlightCard from '@/components/SpotlightCard';
import { User, Coins, FileText, HelpCircle, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

interface Profile {
  username: string;
  points: number;
  avatar_url: string | null;
}

interface Spotlight {
  id: string;
  type: string;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string | null;
  color: string | null;
  is_active: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [articleCount, setArticleCount] = useState(0);
  const [tipCount, setTipCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const [profileRes, spotlightsRes, articlesRes, tipsRes] = await Promise.all([
      supabase.from('profiles').select('username, points, avatar_url').eq('id', user!.id).maybeSingle(),
      supabase.from('spotlights').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('author_id', user!.id),
      supabase.from('guessing_tips').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    setSpotlights((spotlightsRes.data as any[]) || []);
    setArticleCount(articlesRes.count || 0);
    setTipCount(tipsRes.count || 0);
  };

  if (!profile) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Summary Card */}
      <Card className="shadow-card border-0 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary shrink-0">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-xl truncate">
                Ahoj, {profile.username}! 👋
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
                  <Coins className="w-3 h-3" />
                  {profile.points} bodů
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <FileText className="w-3 h-3" />
                  {articleCount} článků
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <HelpCircle className="w-3 h-3" />
                  {tipCount} tipů
                </Badge>
              </div>
            </div>
            <Link to={`/u/${profile.username}`}>
              <Button variant="outline" size="sm" className="gap-2 shrink-0">
                <User className="w-4 h-4" />
                Vizitka
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Spotlights */}
      {spotlights.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Doporučujeme
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spotlights.map(s => (
              <SpotlightCard key={s.id} spotlight={s} />
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <Leaderboard />
    </div>
  );
}
