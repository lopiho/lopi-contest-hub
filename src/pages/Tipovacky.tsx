import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';

export default function Tipovacky() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-card">
              <HelpCircle className="w-6 h-6 text-accent-foreground" />
            </div>
            Tipovačky
          </h1>
          <p className="text-muted-foreground mt-2">
            Tipuj odpovědi na otázky a soutěž o body!
          </p>
        </div>

        <Card className="text-center py-16">
          <CardContent>
            <HelpCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-display font-bold mb-2">Připravujeme</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Tipovačky budou brzy k dispozici. Organizátor zde bude zveřejňovat fotky s otázkami a ty budeš tipovat odpovědi!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
