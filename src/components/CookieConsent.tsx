import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const COOKIE_KEY = 'cookie_consent_accepted';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(COOKIE_KEY);
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg p-4 flex flex-col sm:flex-row items-center gap-4">
        <Cookie className="w-6 h-6 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          Tento web používá cookies pro správné fungování přihlášení a ukládání vašich preferencí. 
          Pokračováním souhlasíte s jejich použitím.
        </p>
        <Button onClick={accept} size="sm" className="shrink-0 active:scale-[0.97]">
          Rozumím
        </Button>
      </div>
    </div>
  );
}
