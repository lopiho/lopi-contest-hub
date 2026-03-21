import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trophy, Clock, AlertTriangle, Plus, Trash2, Loader2 } from 'lucide-react';

interface Winner {
  rank: number;
  username: string;
  points: number;
  prize: string;
}

export default function CompetitionManager() {
  const [status, setStatus] = useState<string>('active');
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    const { data } = await supabase
      .from('site_content')
      .select('key, content')
      .in('key', ['competition_status', 'competition_winners']);

    if (data) {
      const s = data.find(d => d.key === 'competition_status');
      const w = data.find(d => d.key === 'competition_winners');
      if (s) setStatus(s.content);
      if (w?.content) {
        try { setWinners(JSON.parse(w.content)); } catch {}
      }
    }
    setLoading(false);
  };

  const saveStatus = async (newStatus: string) => {
    setSaving(true);
    await supabase
      .from('site_content')
      .update({ content: newStatus })
      .eq('key', 'competition_status');
    setStatus(newStatus);
    toast.success(`Stav soutěže změněn na: ${
      newStatus === 'active' ? 'Aktivní' : 
      newStatus === 'evaluating' ? 'Vyhodnocování' : 'Ukončena'
    }`);
    setSaving(false);
  };

  const saveWinners = async () => {
    setSaving(true);
    await supabase
      .from('site_content')
      .update({ content: JSON.stringify(winners) })
      .eq('key', 'competition_winners');
    toast.success('Výherci uloženi');
    setSaving(false);
  };

  const addWinner = () => {
    setWinners([...winners, { rank: winners.length + 1, username: '', points: 0, prize: '' }]);
  };

  const removeWinner = (index: number) => {
    const updated = winners.filter((_, i) => i !== index).map((w, i) => ({ ...w, rank: i + 1 }));
    setWinners(updated);
  };

  const updateWinner = (index: number, field: keyof Winner, value: string | number) => {
    const updated = [...winners];
    updated[index] = { ...updated[index], [field]: value };
    setWinners(updated);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Načítání...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Stav soutěže
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Aktuální stav:</span>
            <Badge variant={status === 'active' ? 'default' : status === 'evaluating' ? 'secondary' : 'destructive'}>
              {status === 'active' ? '🟢 Aktivní' : status === 'evaluating' ? '🟡 Vyhodnocování' : '🔴 Ukončena'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant={status === 'active' ? 'default' : 'outline'}
              onClick={() => saveStatus('active')}
              disabled={saving || status === 'active'}
            >
              🟢 Aktivní
            </Button>
            <Button
              variant={status === 'evaluating' ? 'secondary' : 'outline'}
              onClick={() => saveStatus('evaluating')}
              disabled={saving || status === 'evaluating'}
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              Vyhodnocování
            </Button>
            <Button
              variant={status === 'finished' ? 'destructive' : 'outline'}
              onClick={() => saveStatus('finished')}
              disabled={saving || status === 'finished'}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Ukončit + vyhlásit
            </Button>
          </div>

          {status !== 'active' && (
            <p className="text-sm text-destructive font-medium mt-2">
              ⚠️ Na všech stránkách (mimo admin) se zobrazuje banner o ukončení soutěže.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Výherci a ceny
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {winners.map((winner, i) => (
            <div key={i} className="flex items-end gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="w-8 text-center font-display font-bold text-lg text-primary">
                {winner.rank}.
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Přezdívka</Label>
                  <Input
                    value={winner.username}
                    onChange={e => updateWinner(i, 'username', e.target.value)}
                    placeholder="@username"
                  />
                </div>
                <div>
                  <Label className="text-xs">Body</Label>
                  <Input
                    type="number"
                    value={winner.points}
                    onChange={e => updateWinner(i, 'points', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cena</Label>
                  <Input
                    value={winner.prize}
                    onChange={e => updateWinner(i, 'prize', e.target.value)}
                    placeholder="Popis ceny..."
                  />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeWinner(i)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}

          <div className="flex gap-3">
            <Button variant="outline" onClick={addWinner} className="gap-2">
              <Plus className="w-4 h-4" />
              Přidat výherce
            </Button>
            <Button onClick={saveWinners} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Uložit výherce
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
