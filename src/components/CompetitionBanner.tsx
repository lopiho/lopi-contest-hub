import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Clock, Award, Coins, Medal } from 'lucide-react';

interface Winner {
  rank: number;
  username: string;
  points: number;
  prize: string;
}

interface CompetitionState {
  status: 'active' | 'evaluating' | 'finished';
  winners: Winner[];
}

export default function CompetitionBanner() {
  const [state, setState] = useState<CompetitionState | null>(null);

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    const { data } = await supabase
      .from('site_content')
      .select('key, content')
      .in('key', ['competition_status', 'competition_winners']);

    if (!data) return;

    const statusRow = data.find(d => d.key === 'competition_status');
    const winnersRow = data.find(d => d.key === 'competition_winners');

    const status = (statusRow?.content || 'active') as CompetitionState['status'];
    
    if (status === 'active') {
      setState(null);
      return;
    }

    let winners: Winner[] = [];
    try {
      if (winnersRow?.content) {
        winners = JSON.parse(winnersRow.content);
      }
    } catch {}

    setState({ status, winners });
  };

  if (!state) return null;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="font-bold text-muted-foreground">{rank}.</span>;
    }
  };

  if (state.status === 'evaluating') {
    return (
      <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-b-2 border-yellow-500/40">
        <div className="container mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-yellow-600 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-display font-bold text-foreground">
              Soutěž byla ukončena
            </h2>
            <Clock className="w-6 h-6 text-yellow-600 animate-pulse" />
          </div>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Probíhá vyhodnocování výsledků. Výherci budou brzy vyhlášeni!
          </p>
        </div>
      </div>
    );
  }

  if (state.status === 'finished') {
    return (
      <div className="bg-gradient-to-r from-yellow-500/20 via-amber-400/30 to-yellow-500/20 border-b-2 border-yellow-500/50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="w-7 h-7 text-yellow-500" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Soutěž skončila — Výherci!
              </h2>
              <Trophy className="w-7 h-7 text-yellow-500" />
            </div>
            <p className="text-muted-foreground">
              Děkujeme všem za účast! Zde jsou výsledky:
            </p>
          </div>

          {state.winners.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
              {state.winners.map((winner, i) => (
                <Card key={i} className={`min-w-[200px] border-2 ${
                  winner.rank === 1 ? 'border-yellow-500/50 bg-yellow-500/10' :
                  winner.rank === 2 ? 'border-gray-400/50 bg-gray-400/10' :
                  winner.rank === 3 ? 'border-amber-600/50 bg-amber-600/10' :
                  'border-border'
                }`}>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      {getRankIcon(winner.rank)}
                    </div>
                    <p className="font-display font-bold text-lg">{winner.username}</p>
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{winner.points} bodů</span>
                    </div>
                    {winner.prize && (
                      <p className="text-sm text-primary font-medium mt-2">
                        🎁 {winner.prize}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
