import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, GripVertical, Megaphone } from 'lucide-react';

interface Spotlight {
  id: string;
  type: string;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string | null;
  color: string | null;
  reference_id: string | null;
  is_active: boolean;
  sort_order: number;
}

const spotlightTypes = [
  { value: 'article', label: 'Článek' },
  { value: 'user', label: 'Člověk' },
  { value: 'game', label: 'Tipovačka' },
  { value: 'shop_item', label: 'Položka z obchůdku' },
  { value: 'custom', label: 'Vlastní' },
];

const alikColors: Record<string, string> = {
  'Soutěže (oranžová)': 'linear-gradient(135deg, #ED6A00, #F90)',
  'Nástěnky (modrá)': 'linear-gradient(135deg, #38D, #5AF)',
  'Vtipy (fialová)': 'linear-gradient(135deg, #B4E, #D6F)',
  'Hry (zelená)': 'linear-gradient(135deg, #8A0, #AC2)',
  'Poradna (oranž.)': 'linear-gradient(135deg, #F90, #FB2)',
  'Obchůdek (zlatá)': 'linear-gradient(135deg, #ECB300, #FC0)',
  'Titulka (zelená)': 'linear-gradient(180deg, rgba(230,246,174,1), rgba(255,255,255,0.85))',
};

export default function SpotlightManager() {
  const { user } = useAuth();
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Spotlight | null>(null);

  const [form, setForm] = useState({
    type: 'custom',
    title: '',
    description: '',
    link: '',
    image_url: '',
    color: '',
    is_active: true,
  });

  useEffect(() => {
    fetchSpotlights();
  }, []);

  const fetchSpotlights = async () => {
    const { data } = await supabase
      .from('spotlights')
      .select('*')
      .order('sort_order', { ascending: true });
    setSpotlights((data as any[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ type: 'custom', title: '', description: '', link: '', image_url: '', color: '', is_active: true });
    setEditing(null);
  };

  const openEdit = (s: Spotlight) => {
    setEditing(s);
    setForm({
      type: s.type,
      title: s.title,
      description: s.description || '',
      link: s.link || '',
      image_url: s.image_url || '',
      color: s.color || '',
      is_active: s.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Název je povinný');
      return;
    }

    // Auto-set links for known types
    let link = form.link;
    if (form.type === 'article' && !link) link = '/clankovnice';
    if (form.type === 'game' && !link) link = '/tipovacky';
    if (form.type === 'shop_item' && !link) link = '/obchudek';

    const payload = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      link: link.trim() || null,
      image_url: form.image_url.trim() || null,
      color: form.color.trim() || null,
      is_active: form.is_active,
      created_by: user!.id,
    };

    if (editing) {
      const { error } = await supabase
        .from('spotlights')
        .update(payload)
        .eq('id', editing.id);
      if (error) {
        toast.error('Chyba při ukládání');
        return;
      }
      toast.success('Poutávák upraven');
    } else {
      const { error } = await supabase
        .from('spotlights')
        .insert({ ...payload, sort_order: spotlights.length });
      if (error) {
        toast.error('Chyba při vytváření');
        return;
      }
      toast.success('Poutávák vytvořen');
    }

    setDialogOpen(false);
    resetForm();
    fetchSpotlights();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('spotlights').delete().eq('id', id);
    if (error) {
      toast.error('Chyba při mazání');
      return;
    }
    toast.success('Poutávák smazán');
    fetchSpotlights();
  };

  const toggleActive = async (s: Spotlight) => {
    await supabase.from('spotlights').update({ is_active: !s.is_active }).eq('id', s.id);
    fetchSpotlights();
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-display">
          <Megaphone className="w-5 h-5 text-primary" />
          Poutáváky
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Nový
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Upravit poutávák' : 'Nový poutávák'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Typ</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {spotlightTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Název *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>Popis</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Odkaz (URL)</Label>
                <Input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="/clankovnice nebo https://alik.cz/..." />
              </div>
              <div>
                <Label>Obrázek (URL)</Label>
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
              </div>
              <div>
                <Label>Barva / Pozadí</Label>
                <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="#ED6A00 nebo linear-gradient(...)" />
                {form.link?.includes('alik.cz') && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Alík styly:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(alikColors).map(([name, val]) => (
                        <button
                          key={name}
                          type="button"
                          className="px-2 py-1 text-xs rounded-md border hover:ring-2 ring-primary transition-all"
                          style={{ background: val }}
                          onClick={() => setForm(f => ({ ...f, color: val }))}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Aktivní</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editing ? 'Uložit změny' : 'Vytvořit poutávák'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : spotlights.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Žádné poutáváky</p>
        ) : (
          <div className="space-y-2">
            {spotlights.map(s => (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border ${s.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                {s.color && (
                  <div className="w-6 h-6 rounded-md shrink-0 border" style={{ background: s.color }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{spotlightTypes.find(t => t.value === s.type)?.label || s.type}</p>
                </div>
                <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
