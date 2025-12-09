import { Card, CardContent } from '@/components/ui/card';
import { Camera } from 'lucide-react';

export default function Fotosoutez() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <div className="w-12 h-12 bg-success rounded-2xl flex items-center justify-center shadow-card">
              <Camera className="w-6 h-6 text-success-foreground" />
            </div>
            Fotosoutěž
          </h1>
          <p className="text-muted-foreground mt-2">
            Nahraj fotky dle zadání a sbírej hodnocení!
          </p>
        </div>

        <Card className="text-center py-16">
          <CardContent>
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-display font-bold mb-2">Připravujeme</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Fotosoutěž bude brzy k dispozici. Budeš moci nahrávat fotky dle zadání a ostatní je budou hodnotit!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
