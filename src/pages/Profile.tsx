import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Trophy, FileText, MessageCircle, Edit2, Save, X } from 'lucide-react';
import UserBadge, { getRoleDisplayName, getRoleBadgeColor } from '@/components/UserBadge';
import { LvZJContent } from '@/lib/lvzj-parser';

interface ProfileData {
  id: string;
  username: string;
  bio: string | null;
  points: number;
  created_at: string;
  avatar_url: string | null;
}

interface UserStats {
  articlesCount: number;
  ratingsGiven: number;
  gamesParticipated: number;
}

// Crown component for the profile header
const CrownIcon = ({ color }: { color: 'orange' | 'pink' }) => (
  <svg
    viewBox="0 0 24 24"
    className={`w-8 h-8 ${color === 'orange' ? 'text-primary' : 'text-pink-400'}`}
    fill="currentColor"
  >
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
  </svg>
);

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [stats, setStats] = useState<UserStats>({ articlesCount: 0, ratingsGiven: 0, gamesParticipated: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  const isOwnProfile = user && profile && user.id === profile.id;

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    setNotFound(false);

    // Get profile by username
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Cast to include bio field which may not be in types yet
    const profileWithBio = {
      ...profileData,
      bio: (profileData as any).bio || null
    } as ProfileData;
    setProfile(profileWithBio);
    setEditBio(profileWithBio.bio || '');
    setEditBio(profileWithBio.bio || '');

    // Fetch roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profileData.id);

    setRoles(rolesData?.map(r => r.role) || []);

    // Fetch stats
    const [articlesRes, ratingsRes, tipsRes] = await Promise.all([
      supabase.from('articles').select('id', { count: 'exact' }).eq('author_id', profileData.id),
      supabase.from('article_ratings').select('id', { count: 'exact' }).eq('user_id', profileData.id),
      supabase.from('guessing_tips').select('id', { count: 'exact' }).eq('user_id', profileData.id),
    ]);

    setStats({
      articlesCount: articlesRes.count || 0,
      ratingsGiven: ratingsRes.count || 0,
      gamesParticipated: tipsRes.count || 0,
    });

    setLoading(false);
  };

  const handleSaveBio = async () => {
    if (!profile || !isOwnProfile) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ bio: editBio } as any)
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, bio: editBio });
      setIsEditing(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="py-12">
            <h2 className="text-2xl font-display font-bold mb-2">Uživatel nenalezen</h2>
            <p className="text-muted-foreground">Uživatel @{username} neexistuje.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  const isOrganizer = roles.includes('organizer');
  const isHelper = roles.includes('helper');

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {/* Avatar placeholder */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl font-display font-bold text-primary">
                {profile.username.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                    @{profile.username}
                    {isOrganizer && <CrownIcon color="orange" />}
                    {isHelper && !isOrganizer && <CrownIcon color="pink" />}
                  </h1>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {roles.filter(r => r !== 'user').map(role => (
                    <Badge key={role} className={getRoleBadgeColor(role)}>
                      {getRoleDisplayName(role)}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">{profile.points}</span> bodů
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">O mně</CardTitle>
              {isOwnProfile && !isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Upravit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Napiš něco o sobě... Můžeš použít LvZJ formátování!"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Můžeš použít LvZJ formátování jako (tučně), (kurzívou), (červeně) atd.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleSaveBio} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Uložit
                  </Button>
                  <Button variant="outline" onClick={() => { setIsEditing(false); setEditBio(profile.bio || ''); }}>
                    <X className="w-4 h-4 mr-1" />
                    Zrušit
                  </Button>
                </div>
              </div>
            ) : profile.bio ? (
              <LvZJContent content={profile.bio} />
            ) : (
              <p className="text-muted-foreground italic">
                {isOwnProfile ? 'Zatím jsi o sobě nic nenapsal/a.' : 'Tento uživatel o sobě zatím nic nenapsal.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistiky</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stats.articlesCount}</div>
                <div className="text-xs text-muted-foreground">Článků</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">{stats.ratingsGiven}</div>
                <div className="text-xs text-muted-foreground">Hodnocení</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <MessageCircle className="w-6 h-6 mx-auto mb-2 text-accent" />
                <div className="text-2xl font-bold">{stats.gamesParticipated}</div>
                <div className="text-xs text-muted-foreground">Tipovačky</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
