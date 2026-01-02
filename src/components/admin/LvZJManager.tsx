import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LvZJContent } from '@/lib/lvzj-parser';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, Code, Lightbulb, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const CATEGORIES = [
  'Stylování textu',
  'Barvy textu',
  'Podbarvení',
  'Kombinace stylů',
  'Odkazy',
  'Nadpisy a zarovnání',
  'Seznamy',
  'Boxíky',
  'Citace',
  'Oddělovače',
  'Žížalky',
  'Interaktivní prvky',
  'Speciální'
];

const COLOR_OPTIONS = [
  { value: 'primary', label: 'Primární (modrá)' },
  { value: 'accent', label: 'Akcentová' },
  { value: 'green', label: 'Zelená' },
  { value: 'yellow', label: 'Žlutá' },
  { value: 'red', label: 'Červená' },
  { value: 'purple', label: 'Fialová' }
];

export default function LvZJManager() {
  const { user } = useAuth();
  const [examples, setExamples] = useState<LvZJExample[]>([]);
  const [tips, setTips] = useState<LvZJTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Example dialogs
  const [newExampleOpen, setNewExampleOpen] = useState(false);
  const [newExample, setNewExample] = useState({ category: '', code: '', description: '' });
  const [editExample, setEditExample] = useState<LvZJExample | null>(null);
  const [editedExample, setEditedExample] = useState({ category: '', code: '', description: '', is_visible: true });

  // Tip dialogs
  const [newTipOpen, setNewTipOpen] = useState(false);
  const [newTip, setNewTip] = useState({ title: '', content: '', color_class: 'primary' });
  const [editTip, setEditTip] = useState<LvZJTip | null>(null);
  const [editedTip, setEditedTip] = useState({ title: '', content: '', color_class: 'primary', is_visible: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch examples from site_content
    const { data: examplesData } = await supabase
      .from('site_content')
      .select('*')
      .eq('key', 'lvzj_examples')
      .maybeSingle();

    if (examplesData) {
      try {
        setExamples(JSON.parse(examplesData.content) || []);
      } catch {
        setExamples([]);
      }
    }

    // Fetch tips from site_content
    const { data: tipsData } = await supabase
      .from('site_content')
      .select('*')
      .eq('key', 'lvzj_tips')
      .maybeSingle();

    if (tipsData) {
      try {
        setTips(JSON.parse(tipsData.content) || []);
      } catch {
        setTips([]);
      }
    }

    setLoading(false);
  };

  const saveExamples = async (newExamples: LvZJExample[]) => {
    const { data: existing } = await supabase
      .from('site_content')
      .select('id')
      .eq('key', 'lvzj_examples')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('site_content')
        .update({
          content: JSON.stringify(newExamples),
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('key', 'lvzj_examples');
    } else {
      await supabase
        .from('site_content')
        .insert({
          key: 'lvzj_examples',
          content: JSON.stringify(newExamples),
          updated_by: user?.id
        });
    }
    setExamples(newExamples);
  };

  const saveTips = async (newTips: LvZJTip[]) => {
    const { data: existing } = await supabase
      .from('site_content')
      .select('id')
      .eq('key', 'lvzj_tips')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('site_content')
        .update({
          content: JSON.stringify(newTips),
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('key', 'lvzj_tips');
    } else {
      await supabase
        .from('site_content')
        .insert({
          key: 'lvzj_tips',
          content: JSON.stringify(newTips),
          updated_by: user?.id
        });
    }
    setTips(newTips);
  };

  // Example handlers
  const handleCreateExample = async () => {
    if (!newExample.category || !newExample.code.trim() || !newExample.description.trim()) {
      toast.error('Vyplň všechna pole');
      return;
    }

    setProcessing(true);
    const newExampleItem: LvZJExample = {
      id: crypto.randomUUID(),
      category: newExample.category,
      code: newExample.code.trim(),
      description: newExample.description.trim(),
      is_visible: true,
      sort_order: examples.length
    };

    await saveExamples([...examples, newExampleItem]);
    toast.success('Příklad přidán');
    setNewExample({ category: '', code: '', description: '' });
    setNewExampleOpen(false);
    setProcessing(false);
  };

  const handleUpdateExample = async () => {
    if (!editExample) return;

    setProcessing(true);
    const updated = examples.map(e => 
      e.id === editExample.id 
        ? { ...e, ...editedExample }
        : e
    );
    await saveExamples(updated);
    toast.success('Příklad upraven');
    setEditExample(null);
    setProcessing(false);
  };

  const handleToggleExampleVisible = async (example: LvZJExample) => {
    const updated = examples.map(e => 
      e.id === example.id 
        ? { ...e, is_visible: !e.is_visible }
        : e
    );
    await saveExamples(updated);
    toast.success(example.is_visible ? 'Příklad skryt' : 'Příklad zobrazen');
  };

  const handleDeleteExample = async (example: LvZJExample) => {
    if (!confirm('Smazat tento příklad?')) return;
    const updated = examples.filter(e => e.id !== example.id);
    await saveExamples(updated);
    toast.success('Příklad smazán');
  };

  // Tip handlers
  const handleCreateTip = async () => {
    if (!newTip.title.trim() || !newTip.content.trim()) {
      toast.error('Vyplň název a obsah');
      return;
    }

    setProcessing(true);
    const newTipItem: LvZJTip = {
      id: crypto.randomUUID(),
      title: newTip.title.trim(),
      content: newTip.content.trim(),
      color_class: newTip.color_class,
      is_visible: true,
      sort_order: tips.length
    };

    await saveTips([...tips, newTipItem]);
    toast.success('Tip přidán');
    setNewTip({ title: '', content: '', color_class: 'primary' });
    setNewTipOpen(false);
    setProcessing(false);
  };

  const handleUpdateTip = async () => {
    if (!editTip) return;

    setProcessing(true);
    const updated = tips.map(t => 
      t.id === editTip.id 
        ? { ...t, ...editedTip }
        : t
    );
    await saveTips(updated);
    toast.success('Tip upraven');
    setEditTip(null);
    setProcessing(false);
  };

  const handleToggleTipVisible = async (tip: LvZJTip) => {
    const updated = tips.map(t => 
      t.id === tip.id 
        ? { ...t, is_visible: !t.is_visible }
        : t
    );
    await saveTips(updated);
    toast.success(tip.is_visible ? 'Tip skryt' : 'Tip zobrazen');
  };

  const handleDeleteTip = async (tip: LvZJTip) => {
    if (!confirm('Smazat tento tip?')) return;
    const updated = tips.filter(t => t.id !== tip.id);
    await saveTips(updated);
    toast.success('Tip smazán');
  };

  const openEditExample = (example: LvZJExample) => {
    setEditExample(example);
    setEditedExample({
      category: example.category,
      code: example.code,
      description: example.description,
      is_visible: example.is_visible
    });
  };

  const openEditTip = (tip: LvZJTip) => {
    setEditTip(tip);
    setEditedTip({
      title: tip.title,
      content: tip.content,
      color_class: tip.color_class,
      is_visible: tip.is_visible
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="examples">
        <TabsList>
          <TabsTrigger value="examples" className="flex items-center gap-1">
            <Code className="w-4 h-4" />
            Příklady ({examples.length})
          </TabsTrigger>
          <TabsTrigger value="tips" className="flex items-center gap-1">
            <Lightbulb className="w-4 h-4" />
            Tipy ({tips.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="examples" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={newExampleOpen} onOpenChange={setNewExampleOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nový příklad
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nový LvZJ příklad</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Kategorie</Label>
                    <Select value={newExample.category} onValueChange={(v) => setNewExample({ ...newExample, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyber kategorii" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kód</Label>
                    <Textarea
                      value={newExample.code}
                      onChange={(e) => setNewExample({ ...newExample, code: e.target.value })}
                      placeholder="(tučně)Příklad"
                      rows={2}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Popis</Label>
                    <Input
                      value={newExample.description}
                      onChange={(e) => setNewExample({ ...newExample, description: e.target.value })}
                      placeholder="Popis příkladu"
                    />
                  </div>
                  {newExample.code && (
                    <div className="space-y-2">
                      <Label>Náhled</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <LvZJContent content={newExample.code} />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewExampleOpen(false)}>Zrušit</Button>
                  <Button onClick={handleCreateExample} disabled={processing}>
                    {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    Přidat
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {examples.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Zatím žádné vlastní příklady. Výchozí příklady jsou v kódu.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {examples.map((example) => (
                <Card key={example.id} className={!example.is_visible ? 'opacity-60' : ''}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{example.category}</Badge>
                            <span className="text-sm font-medium truncate">{example.description}</span>
                            {!example.is_visible && (
                              <Badge variant="outline" className="text-xs">Skrytý</Badge>
                            )}
                          </div>
                          <code className="text-xs text-muted-foreground font-mono block truncate mt-1">
                            {example.code}
                          </code>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleExampleVisible(example)}>
                          {example.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditExample(example)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExample(example)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tips" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={newTipOpen} onOpenChange={setNewTipOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nový tip
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nový tip</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Název</Label>
                    <Input
                      value={newTip.title}
                      onChange={(e) => setNewTip({ ...newTip, title: e.target.value })}
                      placeholder="Název tipu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Obsah</Label>
                    <Textarea
                      value={newTip.content}
                      onChange={(e) => setNewTip({ ...newTip, content: e.target.value })}
                      placeholder="Obsah tipu..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Barva</Label>
                    <Select value={newTip.color_class} onValueChange={(v) => setNewTip({ ...newTip, color_class: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewTipOpen(false)}>Zrušit</Button>
                  <Button onClick={handleCreateTip} disabled={processing}>
                    {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    Přidat
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {tips.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Zatím žádné vlastní tipy. Výchozí tipy jsou v kódu.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tips.map((tip) => (
                <Card key={tip.id} className={!tip.is_visible ? 'opacity-60' : ''}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tip.title}</span>
                            <Badge variant="outline" className="text-xs">{tip.color_class}</Badge>
                            {!tip.is_visible && (
                              <Badge variant="secondary" className="text-xs">Skrytý</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{tip.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleTipVisible(tip)}>
                          {tip.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditTip(tip)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTip(tip)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Example Dialog */}
      <Dialog open={!!editExample} onOpenChange={(open) => !open && setEditExample(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit příklad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={editedExample.category} onValueChange={(v) => setEditedExample({ ...editedExample, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kód</Label>
              <Textarea
                value={editedExample.code}
                onChange={(e) => setEditedExample({ ...editedExample, code: e.target.value })}
                rows={2}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Popis</Label>
              <Input
                value={editedExample.description}
                onChange={(e) => setEditedExample({ ...editedExample, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editedExample.is_visible}
                onCheckedChange={(checked) => setEditedExample({ ...editedExample, is_visible: checked })}
              />
              <Label>Viditelný</Label>
            </div>
            {editedExample.code && (
              <div className="space-y-2">
                <Label>Náhled</Label>
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <LvZJContent content={editedExample.code} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExample(null)}>Zrušit</Button>
            <Button onClick={handleUpdateExample} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tip Dialog */}
      <Dialog open={!!editTip} onOpenChange={(open) => !open && setEditTip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit tip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Název</Label>
              <Input
                value={editedTip.title}
                onChange={(e) => setEditedTip({ ...editedTip, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Obsah</Label>
              <Textarea
                value={editedTip.content}
                onChange={(e) => setEditedTip({ ...editedTip, content: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Barva</Label>
              <Select value={editedTip.color_class} onValueChange={(v) => setEditedTip({ ...editedTip, color_class: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editedTip.is_visible}
                onCheckedChange={(checked) => setEditedTip({ ...editedTip, is_visible: checked })}
              />
              <Label>Viditelný</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTip(null)}>Zrušit</Button>
            <Button onClick={handleUpdateTip} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
