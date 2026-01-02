import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LvZJContent } from '@/lib/lvzj-parser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Palette, Link as LinkIcon, List, Type, Box, Quote, Sparkles, Eye, Edit2, Clock, AlertTriangle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LvZJExample {
  id: string;
  category: string;
  code: string;
  description: string;
  is_visible: boolean;
  sort_order: number;
}

interface LvZJTip {
  id: string;
  title: string;
  content: string;
  color_class: string;
  is_visible: boolean;
  sort_order: number;
}

// Default examples (used when no custom examples exist)
const defaultExamples = [
  {
    category: "Stylování textu",
    icon: <Palette className="w-5 h-5" />,
    items: [
      { code: "(tučně)Tučný text", desc: "Tučné písmo" },
      { code: "(kurzívou)Kurzíva", desc: "Kurzíva" },
      { code: "(škrtnuté)Přeškrtnutý text", desc: "Přeškrtnutí" },
      { code: "(horní index)text", desc: "Horní index" },
      { code: "(dolní index)text", desc: "Dolní index" },
      { code: "(strojově)Strojopis", desc: "Strojové písmo" },
      { code: "(kapitálkami)Text kapitálkami", desc: "Kapitálky" },
      { code: "(normálně)Běžný text", desc: "Zrušení stylování" },
    ]
  },
  {
    category: "Barvy textu",
    icon: <Sparkles className="w-5 h-5" />,
    items: [
      { code: "(červeně)Červený text", desc: "Červená" },
      { code: "(zeleně)Zelený text", desc: "Zelená" },
      { code: "(modře)Modrý text", desc: "Modrá" },
      { code: "(žlutě)Žlutý text", desc: "Žlutá" },
      { code: "(oranžově)Oranžový text", desc: "Oranžová" },
      { code: "(růžově)Růžový text", desc: "Růžová" },
      { code: "(fialově)Fialový text", desc: "Fialová" },
      { code: "(hnědě)Hnědý text", desc: "Hnědá" },
      { code: "(šedě)Šedý text", desc: "Šedá" },
      { code: "(modrozeleně)Modrozelený text", desc: "Modrozelená" },
      { code: "(duhově)Duhový text", desc: "Duhová" },
    ]
  },
  {
    category: "Podbarvení",
    icon: <Palette className="w-5 h-5" />,
    items: [
      { code: "(podbarvení)Zvýrazněný text", desc: "Výchozí podbarvení" },
      { code: "(červené podbarvení)Text", desc: "Červené podbarvení" },
      { code: "(zelené podbarvení)Text", desc: "Zelené podbarvení" },
      { code: "(modré podbarvení)Text", desc: "Modré podbarvení" },
      { code: "(žluté podbarvení)Text", desc: "Žluté podbarvení" },
    ]
  },
  {
    category: "Kombinace stylů",
    icon: <Type className="w-5 h-5" />,
    items: [
      { code: "(tučně červeně)Tučný červený", desc: "Tučně + červeně" },
      { code: "(kurzívou modře)Kurzíva modrá", desc: "Kurzíva + modrá" },
      { code: "(tučně kurzívou zeleně)Text", desc: "Kombinace tří stylů" },
      { code: "(škrtnuté šedě)Starý text", desc: "Přeškrtnuté + šedě" },
    ]
  },
  {
    category: "Odkazy",
    icon: <LinkIcon className="w-5 h-5" />,
    items: [
      { code: "https://example.com", desc: "Automatický odkaz" },
      { code: "(odkaz na https://example.com)text odkazu(konec)", desc: "Vlastní text odkazu" },
    ]
  },
  {
    category: "Nadpisy a zarovnání",
    icon: <Type className="w-5 h-5" />,
    items: [
      { code: "(nadpis)Velký nadpis", desc: "Hlavní nadpis" },
      { code: "(malý nadpis)Menší nadpis", desc: "Menší nadpis" },
      { code: "(doprostřed)Vycentrovaný text", desc: "Zarovnání na střed" },
      { code: "(doprava)Text vpravo", desc: "Zarovnání doprava" },
    ]
  },
  {
    category: "Seznamy",
    icon: <List className="w-5 h-5" />,
    items: [
      { code: "- první položka\n- druhá položka\n- třetí položka", desc: "Odrážkový seznam" },
      { code: "(seznam číslovaný)\n- první\n- druhý\n(konec)", desc: "Číslovaný seznam" },
    ]
  },
  {
    category: "Boxíky",
    icon: <Box className="w-5 h-5" />,
    items: [
      { code: "(boxík)Obsah boxíku(konec boxíku)", desc: "Základní boxík" },
      { code: "(boxík \"Titulek\")Obsah(konec boxíku)", desc: "Boxík s titulkem" },
      { code: "(modrý boxík \"Info\")Text(konec boxíku)", desc: "Modrý boxík" },
      { code: "(zelený boxík \"Tip\")Text(konec boxíku)", desc: "Zelený boxík" },
      { code: "(červený boxík \"Varování\")Text(konec boxíku)", desc: "Červený boxík" },
    ]
  },
  {
    category: "Citace",
    icon: <Quote className="w-5 h-5" />,
    items: [
      { code: "(citace)Citovaný text(konec citace)", desc: "Základní citace" },
      { code: "(citace \"Autor\")Text citace(konec citace)", desc: "Citace s autorem" },
      { code: "(citace \"Autor\" https://zdroj.cz)Text(konec citace)", desc: "Citace s odkazem" },
    ]
  },
  {
    category: "Oddělovače",
    icon: <Type className="w-5 h-5" />,
    items: [
      { code: "(oddělovač)", desc: "Vodorovná čára" },
      { code: "(malý oddělovač)", desc: "Menší čára" },
    ]
  },
  {
    category: "Žížalky",
    icon: <Sparkles className="w-5 h-5" />,
    items: [
      { code: "(žížalka 50 %)", desc: "Progress bar na 50%" },
      { code: "(žížalka 3 / 5)", desc: "Progress bar 3 z 5" },
      { code: "(modrá žížalka 75 %)", desc: "Modrý progress bar" },
      { code: "(zelená žížalka 8 / 10)", desc: "Zelený progress bar" },
      { code: "(červená žížalka 25 %)", desc: "Červený progress bar" },
    ]
  },
  {
    category: "Interaktivní prvky",
    icon: <AlertTriangle className="w-5 h-5" />,
    items: [
      { code: "(spoiler)Skrytý text(konec)", desc: "Spoiler (klikni pro zobrazení)" },
      { code: "(odpočet do 31. 12. 2026 23:59)", desc: "Odpočet do data" },
      { code: "(odpočet od 1. 1. 2020)", desc: "Odpočet od data" },
      { code: "(odpočet slovně do 31. 12. 2026)", desc: "Slovní odpočet" },
    ]
  },
  {
    category: "Speciální",
    icon: <Sparkles className="w-5 h-5" />,
    items: [
      { code: "(závorka)", desc: "Zobrazí závorku bez zpracování" },
      { code: "(prostě)nezpracovaný text(azj)", desc: "Text bez LvZJ zpracování" },
    ]
  },
];

const defaultTips = [
  {
    title: "Kombinování stylů",
    content: "Styly můžeš kombinovat v jednom příkazu: (tučně červeně kurzívou)",
    color_class: "primary"
  },
  {
    title: "Konec řádku ruší stylování",
    content: "Každý nový řádek automaticky vrátí text do normálního stylu. Nemusíš používat (normálně).",
    color_class: "accent"
  },
  {
    title: "Vnořené prvky",
    content: "Boxíky a citace mohou obsahovat další LvZJ formátování uvnitř.",
    color_class: "green"
  },
  {
    title: "Escape závorek",
    content: "Pokud potřebuješ napsat závorku bez zpracování, použij (závorka) nebo obal text mezi (prostě) a (azj).",
    color_class: "yellow"
  }
];

const colorClasses: Record<string, string> = {
  primary: "bg-primary/5 border-primary/20",
  accent: "bg-accent/10 border-accent/20",
  green: "bg-green-500/10 border-green-500/20",
  yellow: "bg-yellow-500/10 border-yellow-500/20",
  red: "bg-red-500/10 border-red-500/20",
  purple: "bg-purple-500/10 border-purple-500/20"
};

const categoryIcons: Record<string, React.ReactNode> = {
  "Stylování textu": <Palette className="w-5 h-5" />,
  "Barvy textu": <Sparkles className="w-5 h-5" />,
  "Podbarvení": <Palette className="w-5 h-5" />,
  "Kombinace stylů": <Type className="w-5 h-5" />,
  "Odkazy": <LinkIcon className="w-5 h-5" />,
  "Nadpisy a zarovnání": <Type className="w-5 h-5" />,
  "Seznamy": <List className="w-5 h-5" />,
  "Boxíky": <Box className="w-5 h-5" />,
  "Citace": <Quote className="w-5 h-5" />,
  "Oddělovače": <Type className="w-5 h-5" />,
  "Žížalky": <Sparkles className="w-5 h-5" />,
  "Interaktivní prvky": <AlertTriangle className="w-5 h-5" />,
  "Speciální": <Sparkles className="w-5 h-5" />
};

export default function LvZJ() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [testInput, setTestInput] = useState('(tučně)Ahoj světe!\n\n(červeně)Červený text(normálně) a pak normální.\n\n(spoiler)Tajný obsah(konec)\n\n(žížalka 75 %)');
  const [customExamples, setCustomExamples] = useState<LvZJExample[]>([]);
  const [customTips, setCustomTips] = useState<LvZJTip[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    fetchCustomData();
    if (user) {
      checkRole();
    }
  }, [user]);

  const checkRole = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id);
    setIsOrganizer(data?.some(r => r.role === 'organizer' || r.role === 'helper') || false);
  };

  const fetchCustomData = async () => {
    // Fetch custom examples
    const { data: examplesData } = await supabase
      .from('site_content')
      .select('*')
      .eq('key', 'lvzj_examples')
      .maybeSingle();

    if (examplesData) {
      try {
        const parsed = JSON.parse(examplesData.content);
        setCustomExamples(parsed.filter((e: LvZJExample) => e.is_visible));
      } catch {
        setCustomExamples([]);
      }
    }

    // Fetch custom tips
    const { data: tipsData } = await supabase
      .from('site_content')
      .select('*')
      .eq('key', 'lvzj_tips')
      .maybeSingle();

    if (tipsData) {
      try {
        const parsed = JSON.parse(tipsData.content);
        setCustomTips(parsed.filter((t: LvZJTip) => t.is_visible));
      } catch {
        setCustomTips([]);
      }
    }
  };

  // Merge custom examples with defaults, grouping by category
  const getExamplesForCategory = (category: string) => {
    const defaultItems = defaultExamples.find(e => e.category === category)?.items || [];
    const customItems = customExamples
      .filter(e => e.category === category)
      .map(e => ({ code: e.code, desc: e.description }));
    return [...defaultItems, ...customItems];
  };

  const allCategories = [...new Set([
    ...defaultExamples.map(e => e.category),
    ...customExamples.map(e => e.category)
  ])];

  // Merge tips
  const displayTips = customTips.length > 0 
    ? customTips.map(t => ({
        title: t.title,
        content: t.content,
        color_class: t.color_class
      }))
    : defaultTips;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-card">
            <BookOpen className="w-8 h-8 text-secondary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">LvZJ – Lopihův značkovací jazyk</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Formátovací jazyk pro texty na Lopíku. Všechny příkazy píšeš do obyčejných závorek, česky, 
            jako bys někomu diktoval/a pokyny.
          </p>
          {isOrganizer && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/admin')}>
              <Settings className="w-4 h-4 mr-1" />
              Upravit příklady a tipy
            </Button>
          )}
        </div>

        {/* Test area */}
        <Card className="mb-8 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Vyzkoušej si LvZJ
            </CardTitle>
            <CardDescription>
              Napiš text s LvZJ příkazy a sleduj živý náhled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <Edit2 className="w-4 h-4" />
                  Vstup
                </div>
                <Textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={8}
                  placeholder="Napiš text s LvZJ formátováním..."
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  Náhled
                </div>
                <div className="p-4 bg-muted/50 rounded-lg min-h-[200px] border">
                  <LvZJContent content={testInput} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reference */}
        <Tabs defaultValue="stylování-textu" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            {allCategories.map((cat) => (
              <TabsTrigger key={cat} value={cat.toLowerCase().replace(/\s+/g, '-')} className="text-xs">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {allCategories.map((category) => (
            <TabsContent key={category} value={category.toLowerCase().replace(/\s+/g, '-')}>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {categoryIcons[category] || <Sparkles className="w-5 h-5" />}
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getExamplesForCategory(category).map((item, i) => (
                      <div key={i} className="grid md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Kód</div>
                          <code className="text-sm font-mono bg-background px-2 py-1 rounded block whitespace-pre-wrap break-all">
                            {item.code}
                          </code>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Výsledek</div>
                          <div className="bg-background p-2 rounded min-h-[32px]">
                            <LvZJContent content={item.code} />
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Badge variant="secondary">{item.desc}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Tips */}
        <Card className="mt-8 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Tipy a triky
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayTips.map((tip, i) => (
              <div key={i} className={`p-4 rounded-lg border ${colorClasses[tip.color_class] || colorClasses.primary}`}>
                <h3 className="font-semibold mb-2">{tip.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {tip.content.includes('(') ? (
                    <>
                      {tip.content.split(/(\([^)]+\))/).map((part, j) => 
                        part.startsWith('(') && part.endsWith(')') 
                          ? <code key={j} className="bg-background px-1 rounded">{part}</code>
                          : part
                      )}
                    </>
                  ) : tip.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
